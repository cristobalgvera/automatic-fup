import {COMMON, DB, TEMPLATE, UI} from '../../config';
import {ByEmailSpreadsheets} from '../interface/by-email-spreadsheets.interface';
import {VendorContact} from '../interface/vendor-contact.interface';
import {excelToSheet} from '../../service/drive.service';
import {getVendorsContact} from '../../service/read.service';
import {obtainEmail, validateEmail} from '../../service/utility.service';
type Blob = GoogleAppsScript.Base.Blob;
type Folder = GoogleAppsScript.Drive.Folder;
type Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;
type GmailMessage = GoogleAppsScript.Gmail.GmailMessage;
type GmailAttachment = GoogleAppsScript.Gmail.GmailAttachment;

// Function to use inside of template html files to modularize responsibilities
function include(filename: string) {
  if (filename)
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function _sendExcelTo({name, email, cc}: VendorContact, attachments: Blob[]) {
  // Use template html file to write mail
  const html = HtmlService.createTemplateFromFile('app/assets/mail');

  // Edit data variable of template html
  html.teamName = name;

  // Create real html from template one (whit all variable data)
  const htmlBody = html.evaluate().getContent();

  console.log(`Sending email to ${name} (<${email}>)`);

  const validCcEmails = cc.split(',').filter(validateEmail).join(',');

  const to = validCcEmails ? `${email},${validCcEmails}` : email;

  try {
    MailApp.sendEmail({
      to,
      htmlBody,
      attachments,
      subject: UI.MAIL.subject(),
      replyTo: UI.MAIL.REPLY_TO,
      name: UI.MAIL.NAME,
    });

    return true;
  } catch (e) {
    console.error(e);
    return false;
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

  const generateSpreadsheets = (message: GmailMessage, mailFolder: Folder) =>
    message
      .getAttachments()
      .filter(byXlsxFiles)
      .reduce(
        (acc, attachment) => {
          console.log(
            `Getting info from '${message.getSubject()}' sended by '${message.getFrom()}' on '${message
              .getDate()
              .toISOString()}'`
          );

          const {email, isValid, spreadsheet} = _createAndFilterSpreadsheet(
            message,
            mailFolder,
            attachment,
            invalidStructureFolder
          );

          return {
            [email]: isValid ? acc[email].concat(spreadsheet) : acc[email],
          };
        },
        {[obtainEmail(message.getFrom())]: []} as ByEmailSpreadsheets
      );

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
    filters: {byIncludeAttachments, byIsVendorData},
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

export {
  _getPurchasesAndRepairsFolders,
  _getUtilitiesToFilterEmails,
  _sendExcelTo,
};
