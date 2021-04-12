import {VendorContact} from '../util/interface/vendor-contact.interface';
import {
  createChildFolderFromFolderId,
  excelToSheet,
  sheetToExcel,
} from './drive.service';
import {ColumnNumbers} from '../util/interface/column-numbers.interface';
import {writeInSheet} from './write.service';
import {obtainEmail, userConfirmation} from './utility.service';
import {COMMON, DB, FOLDER_ID, TEMPLATE, UI} from '../config';
import {getVendorsContact} from './read.service';
import {ByEmailSpreadsheets} from '../util/interface/by-email-spreadsheets.interface';
import Blob = GoogleAppsScript.Base.Blob;
import Folder = GoogleAppsScript.Drive.Folder;
import Sheet = GoogleAppsScript.Spreadsheet.Sheet;
import Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;
import GmailMessage = GoogleAppsScript.Gmail.GmailMessage;
import GmailAttachment = GoogleAppsScript.Gmail.GmailAttachment;

function sendSheetToVendor(
  vendorContact: VendorContact,
  vendorSpreadsheet: Spreadsheet
) {
  const vendorExcel = sheetToExcel(vendorSpreadsheet, vendorContact.name);

  // Return true or false based on success of email send
  return _sendExcelTo(vendorContact, [vendorExcel]);
}

function sendEmail(
  vendorSheet: Sheet,
  vendorData: string[],
  columnNumbers: ColumnNumbers,
  vendorContact: VendorContact,
  vendorSpreadsheet: Spreadsheet
) {
  // Put collected data in an empty vendor file
  writeInSheet(vendorSheet, vendorData, columnNumbers, true);

  let success: boolean;
  do {
    // Convert spreadsheet into Excel file and send it to vendor
    success = sendSheetToVendor(vendorContact, vendorSpreadsheet);

    // In case of email sending fail, user can retry
    if (
      !success &&
      !userConfirmation(UI.MODAL.errorSendingEmailTo(vendorContact))
    )
      success = true;
  } while (!success);
}

function _sendExcelTo({name, email}: VendorContact, attachments: Blob[]) {
  // Use template html file to write mail
  const html = HtmlService.createTemplateFromFile('src/assets/mail');

  // Edit data variable of template html
  html.data = name;

  // Create real html from template one (whit all variable data)
  const htmlBody = html.evaluate().getContent();

  try {
    MailApp.sendEmail({
      to: email,
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

// Function to use inside of template html files to modularize responsibilities
function include(filename: string) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getOpenOrdersFromVendors(email: string, after: string) {
  const folder = createChildFolderFromFolderId(
    FOLDER_ID.EMAIL_AUTOMATED_READS,
    UI.FOLDER.EMAIL_AUTOMATED_READS.getName()
  );

  // Date param must be formatted as YYYY/MM/DD, and day
  // number should be one day before of requested information
  const query = `filename:${COMMON.UTIL.FILE_EXTENSION.XLSX} after:${after}`;
  // const query = `from:(${email}) filename:${COMMON.UTIL.FILE_EXTENSION.XLSX} after:${after}`;

  const {
    filters: {byIncludeAttachments, byIsVendorData},
    reducers: {groupByVendorEmail},
    actions: {generateSpreadsheets},
    extras: {tempFolder, invalidStructureFolder},
  } = _getUtilitiesToFilterEmails(folder);

  // Get list of all attachments where filter condition is true
  // This method take a lot of time to execute, should be optimized
  const attachments = GmailApp.search(query).map(mail => {
    console.log(`First message subject '${mail.getFirstMessageSubject()}'`);
    const mailFolder = tempFolder.createFolder(mail.getFirstMessageSubject());
    return mail
      .getMessages()
      .filter(byIsVendorData)
      .filter(byIncludeAttachments)
      .map(message => generateSpreadsheets(message, mailFolder));
  });

  // Get all attachments grouped by sender email in an object
  const attachmentsByVendor = attachments.reduce(groupByVendorEmail, {});

  // In case all files extracted are readable, delete unreadable files store folder
  if (!invalidStructureFolder.getFiles().hasNext())
    invalidStructureFolder.setTrashed(true);

  // Create a user friendly file for each valid file to read
  // This data will be sended to a consolidator method
  const spreadsheetsByVendor = Object.entries(attachmentsByVendor).reduce(
    (acc, [vendorEmail, files]) => {
      // const vendorFolder = folder.createFolder(vendorEmail);
      const vendorFiles = files.map(file => {
        folder.addFile(DriveApp.getFileById(file.getId()));
        return SpreadsheetApp.openById(file.getId());
      });

      acc[vendorEmail] ??= [];
      acc[vendorEmail].push(...vendorFiles);
      return acc;
    },
    {} as ByEmailSpreadsheets
  );

  // Folder used to store temporal mails attachments
  // data will be sended to trash from Drive
  tempFolder.setTrashed(true);
}

function _getUtilitiesToFilterEmails(folder: Folder) {
  const vendorEmails = _getVendorEmails();

  const byXlsxFiles = (attached: GmailAttachment) =>
    attached.getName().endsWith(COMMON.UTIL.FILE_EXTENSION.XLSX);

  const byIncludeAttachments = (message: GmailMessage) =>
    !!message.getAttachments({includeAttachments: true}).length;

  const byIsVendorData = (message: GmailMessage) =>
    obtainEmail(message.getFrom()) !== COMMON.EMAIL.LATAM_SENDER;

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
  const invalidStructureFolder = folder.createFolder(
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
    // Drive.Files?.remove(file.getId());
    file.setTrashed(true);
    return {email, isValid: false, spreadsheet: null};
  }

  // Kinda filter to extract only requested structure files
  const isValid = _hasRequiredStructure(spreadsheet);

  if (!isValid) {
    invalidStructureFolder.createFile(file);
    // Drive.Files?.remove(spreadsheet.getId());
    DriveApp.getFileById(spreadsheet.getId()).setTrashed(true);
    // Drive.Files?.remove(file.getId());
    file.setTrashed(true);
  }
  return {email, isValid, spreadsheet};
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

function _getVendorEmails() {
  const db = SpreadsheetApp.openById(DB.ID);
  const contacts = getVendorsContact(db);

  return Object.entries(contacts).map(([, {email}]) => email);
}

export {sendSheetToVendor, sendEmail, getOpenOrdersFromVendors};
