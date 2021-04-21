import {COMMON, TEMPLATE, UI} from '../../config';
import {ByEmailSpreadsheets} from '../interface/by-email-spreadsheets.interface';
import {VendorContact} from '../interface/vendor-contact.interface';
import {excelToSheet} from '../../service/drive.service';
import {
  getSeparatedDate,
  obtainEmail,
  validateEmail,
} from '../../service/utility.service';
import {mailRecordService} from '../../service/db/mail-record.service';
import {
  foundSpreadsheetState,
  gettingInfoFrom,
  sendingEmailTo,
} from '../../service/message.service';
import {NOT_FOUND} from '../enum/not-found.enum';
type Blob = GoogleAppsScript.Base.Blob;
type Folder = GoogleAppsScript.Drive.Folder;
type Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;
type GmailMessage = GoogleAppsScript.Gmail.GmailMessage;
type GmailAttachment = GoogleAppsScript.Gmail.GmailAttachment;
type HtmlTemplate = GoogleAppsScript.HTML.HtmlTemplate;

// Function to use inside of template html files to modularize responsibilities
function include(filename: string) {
  if (filename)
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function _sendExcelTo(
  {id, name, email, cc}: VendorContact,
  attachments: Blob[],
  isPurchase = true
) {
  // Use template html file to write mail
  let html: HtmlTemplate;
  if (isPurchase)
    html = HtmlService.createTemplateFromFile('app/assets/mail-purchase');
  else html = HtmlService.createTemplateFromFile('app/assets/mail-repair');

  // Edit data variable of template html
  // html.teamName = name;

  // Create real html from template one (whit all variable data)
  const htmlBody = html.evaluate().getContent();

  console.log(sendingEmailTo(name, email));

  const validCcEmails = cc.split(',').filter(validateEmail).join(',');

  const to = validCcEmails ? `${email},${validCcEmails}` : email;

  let copyTo: string;

  if (!COMMON.DEV_MODE())
    copyTo = isPurchase
      ? COMMON.EMAIL.TO_COPY.PURCHASES.join(',')
      : COMMON.EMAIL.TO_COPY.REPAIRS.join(',');

  try {
    MailApp.sendEmail({
      to,
      htmlBody,
      attachments,
      cc: copyTo,
      subject: UI.MAIL.subject(name),
      replyTo: UI.MAIL.REPLY_TO,
      name: UI.MAIL.NAME,
    });

    return id;
  } catch (error) {
    console.error(error);
    return null;
  }
}

function _getUtilitiesToFilterEmails(folder: Folder) {
  // To avoid Rollup three shaking
  include('');

  const byXlsxFiles = (attached: GmailAttachment) =>
    attached.getName().endsWith(COMMON.UTIL.FILE_EXTENSION.XLSX);

  const byIncludeAttachments = (message: GmailMessage) =>
    !!message.getAttachments({includeAttachments: true}).length;

  const byIsVendorData = (message: GmailMessage) =>
    !COMMON.EMAIL.LATAM_SENDERS.includes(obtainEmail(message.getFrom()));

  const byAlreadyRead = (message: GmailMessage) =>
    !mailRecordService.existsById(message.getId());

  const generateSpreadsheets = (
    message: GmailMessage,
    mailFolder: Folder
  ): [() => void, ByEmailSpreadsheets] => {
    // Can be 'XXXXXX<mail@domain>' or 'mail@domain' format
    const from = message.getFrom();

    const generatedSpreadsheets =
      !COMMON.DEV_MODE() &&
      message
        .getAttachments()
        .filter(byXlsxFiles)
        .reduce(
          (acc, attachment) => {
            console.log(gettingInfoFrom(message, from));

            const {email, isValid, spreadsheet} = _createAndFilterSpreadsheet(
              message,
              mailFolder,
              attachment,
              invalidStructureFolder
            );

            console.log(foundSpreadsheetState(spreadsheet, isValid));

            return {
              [email]: isValid ? acc[email].concat(spreadsheet) : acc[email],
            };
          },
          {[obtainEmail(message.getFrom())]: []} as ByEmailSpreadsheets
        );

    const saveRecordAction = () =>
      mailRecordService.saveOne({
        mailId: message.getId(),
        vendorEmail: obtainEmail(from) || NOT_FOUND.VENDOR_EMAIL,
      });

    return [saveRecordAction, generatedSpreadsheets];
  };

  const groupByVendorEmail = (
    attachmentAcc: ByEmailSpreadsheets,
    thread: ByEmailSpreadsheets[]
  ) => {
    const threadAttachments = thread.reduce((threadAcc, vendor) => {
      const [senderEmail, vendorAttachments] = Object.entries(vendor)[0];

      threadAcc[senderEmail] ??= [];
      threadAcc[senderEmail].push(...vendorAttachments);
      return threadAcc;
    }, {});

    Object.entries(threadAttachments).forEach(attachment => {
      const [senderEmail, vendorAttachments] = attachment;
      if (!vendorAttachments.length) return;

      attachmentAcc[senderEmail] ??= [];
      attachmentAcc[senderEmail].push(...vendorAttachments);
    });
    return attachmentAcc;
  };

  // Folder to store xlsx files obtained from mails
  const tempFolder = DriveApp.createFolder(UI.FOLDER.TEMPORAL.getName());

  // Folder to persist data of unreadable content of xlsx files obtained from mail
  let invalidStructureFolder: Folder;
  const folders = folder.getFoldersByName(
    UI.FOLDER.EMAIL_AUTOMATED_READS.INVALID_FORMAT.getName()
  );

  if (folders.hasNext()) invalidStructureFolder = folders.next();
  else
    invalidStructureFolder = folder.createFolder(
      UI.FOLDER.EMAIL_AUTOMATED_READS.INVALID_FORMAT.getName()
    );

  return {
    filters: {byIncludeAttachments, byIsVendorData, byAlreadyRead},
    reducers: {groupByVendorEmail},
    actions: {generateSpreadsheets},
    extras: {tempFolder, invalidStructureFolder},
  };
}

function _createAndFilterSpreadsheet(
  message: GmailMessage,
  messageFolder: Folder,
  attachment: GmailAttachment,
  invalidStructureFolder: Folder
) {
  const email = obtainEmail(message.getFrom());
  const file = messageFolder.createFile(attachment.copyBlob());
  const spreadsheet = excelToSheet(file, messageFolder);

  if (!spreadsheet) {
    invalidStructureFolder.createFile(file);
    file.setTrashed(true);
    return {email, isValid: false, spreadsheet: null};
  }

  // Kinda filter to extract only requested structure files
  const isValid = _hasRequiredStructure(spreadsheet);

  if (!isValid) {
    invalidStructureFolder.createFile(file);
    DriveApp.getFileById(spreadsheet.getId()).setTrashed(true);
    file.setTrashed(true);
  }

  return {email, isValid, spreadsheet};
}

function _getPurchasesAndRepairsFolders(parentFolder: Folder) {
  const folders = parentFolder.getFolders();
  let purchasesFolder: Folder, repairsFolder: Folder;

  while (folders.hasNext()) {
    const folder = folders.next();

    if (folder.getName() === UI.FOLDER.EMAIL_AUTOMATED_READS.PURCHASES_FOLDER)
      purchasesFolder = folder;
    else if (
      folder.getName() === UI.FOLDER.EMAIL_AUTOMATED_READS.REPAIRS_FOLDER
    )
      repairsFolder = folder;

    if (!!purchasesFolder && !!repairsFolder) break;
  }

  purchasesFolder ??= parentFolder.createFolder(
    UI.FOLDER.EMAIL_AUTOMATED_READS.PURCHASES_FOLDER
  );

  repairsFolder ??= parentFolder.createFolder(
    UI.FOLDER.EMAIL_AUTOMATED_READS.REPAIRS_FOLDER
  );

  return {purchasesFolder, repairsFolder};
}

function _hasRequiredStructure(spreadsheet: Spreadsheet) {
  // If false, means file structure was modified by the
  // vendor before send it or is another file
  return spreadsheet
    .getSheets()
    .some(sheet =>
      sheet
        .getRange(2, 1, 1, sheet.getLastColumn())
        .getValues()[0]
        .includes(TEMPLATE.COLUMN.PURCHASE_ORDER)
    );
}

function _setAfterDate(daysAgo?: number) {
  const after = new Date();
  after.setDate(after.getDate() - (daysAgo ?? 1));

  const {year, month, day} = getSeparatedDate(after);

  return `${year}/${month}/${day}`;
}

export {
  _getPurchasesAndRepairsFolders,
  _getUtilitiesToFilterEmails,
  _sendExcelTo,
  _setAfterDate,
};
