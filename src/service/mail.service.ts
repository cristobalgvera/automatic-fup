import {VendorContact} from '../util/interface/vendor-contact.interface';
import {createChildFolderFromFolderId, sheetToExcel} from './drive.service';
import {ColumnNumbers} from '../util/interface/column-numbers.interface';
import {writeInSheet} from './write.service';
import {userConfirmation} from './utility.service';
import {COMMON, FOLDER_ID, UI} from '../config';
import {evaluateByEmailSpreadsheets} from './read.service';
import {ByEmailSpreadsheets} from '../util/interface/by-email-spreadsheets.interface';
import {
  _getPurchasesAndRepairsFolders,
  _getUtilitiesToFilterEmails,
  _sendExcelTo,
  _setAfterDate,
} from '../util/service/mail.utility';
import {_isPurchaseSpreadsheet} from '../util/service/read.utility';
type Sheet = GoogleAppsScript.Spreadsheet.Sheet;
type Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;
type Folder = GoogleAppsScript.Drive.Folder;

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
  vendorSpreadsheet: Spreadsheet,
  automatic?: boolean,
  isPurchase = true
) {
  // Put collected data in an empty vendor file
  writeInSheet(vendorSheet, vendorData, columnNumbers, isPurchase);

  let success: boolean;
  let tries = 1;
  do {
    // Convert spreadsheet into Excel file and send it to vendor
    success = sendSheetToVendor(vendorContact, vendorSpreadsheet);

    if (success) break;

    // In case of email sending fail, user can retry
    if (!automatic) {
      if (!userConfirmation(UI.MODAL.errorSendingEmailTo(vendorContact)))
        success = true;
    } else if (tries < 3) {
      console.error(`Error sending email to ${vendorContact.id}, retrying...`);
      tries++;
    }
  } while (!success || tries === 3);
}

function getOpenOrdersFromVendors(after?: string) {
  const folders = DriveApp.getFolderById(
    FOLDER_ID.EMAIL_AUTOMATED_READS
  ).getFoldersByName(UI.FOLDER.EMAIL_AUTOMATED_READS.getName());

  let folder: Folder;

  if (folders.hasNext()) folder = folders.next();
  else
    folder = createChildFolderFromFolderId(
      FOLDER_ID.EMAIL_AUTOMATED_READS,
      UI.FOLDER.EMAIL_AUTOMATED_READS.getName()
    );

  after ??= _setAfterDate();

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
      const vendorFiles = files.map(file => {
        const {purchasesFolder, repairsFolder} = _getPurchasesAndRepairsFolders(
          folder
        );
        const spreadsheet = SpreadsheetApp.openById(file.getId());

        if (_isPurchaseSpreadsheet(spreadsheet))
          purchasesFolder.addFile(DriveApp.getFileById(file.getId()));
        else repairsFolder.addFile(DriveApp.getFileById(file.getId()));
        return spreadsheet;
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

  evaluateByEmailSpreadsheets(spreadsheetsByVendor);
}

export {sendSheetToVendor, sendEmail, getOpenOrdersFromVendors};
