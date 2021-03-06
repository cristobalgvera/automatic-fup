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
import {
  errorSendingEmailTo,
  noNewEmailsWasFound,
  totalReadMessages,
  tryingToGetOpenOrdersFrom,
} from './message.service';
import {PurchaseOrder} from '../util/schema/purchase-order.schema';
type Sheet = GoogleAppsScript.Spreadsheet.Sheet;
type Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;
type Folder = GoogleAppsScript.Drive.Folder;

function sendSheetToVendor(
  vendorContact: VendorContact,
  vendorSpreadsheet: Spreadsheet,
  isPurchase = true
) {
  const vendorExcel = sheetToExcel(vendorSpreadsheet, vendorContact.name);

  // Return true or false based on success of email send
  return _sendExcelTo(vendorContact, [vendorExcel], isPurchase);
}

function sendEmail(
  vendorSheet: Sheet,
  vendorData: string[][],
  columnNumbers: ColumnNumbers,
  vendorContact: VendorContact,
  vendorSpreadsheet: Spreadsheet,
  analyticsData: PurchaseOrder[],
  automatic?: boolean,
  isPurchase = true
) {
  // Put collected data in an empty vendor file
  const analytics = writeInSheet(
    vendorSheet,
    vendorData,
    columnNumbers,
    isPurchase
  );

  let id: string;
  let success: boolean;
  let tries = 1;
  do {
    // Convert spreadsheet into Excel file and send it to vendor
    id = sendSheetToVendor(vendorContact, vendorSpreadsheet, isPurchase);

    success = !!id;
    if (success) break;

    // In case of email sending fail, user can retry
    if (!automatic) {
      if (!userConfirmation(UI.MODAL.errorSendingEmailTo(vendorContact)))
        success = true;
    } else if (tries < 3) {
      console.error(errorSendingEmailTo(vendorContact.id));
      tries++;
    }
  } while (!success || tries === 3);

  if (success) analyticsData.push(...analytics);

  return id;
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
  const query = `filename:${COMMON.UTIL.FILE_EXTENSION.XLSX}|${COMMON.UTIL.FILE_EXTENSION.XLS} after:${after}`;
  // const query = `from:(${email}) filename:${COMMON.UTIL.FILE_EXTENSION.XLSX} after:${after}`;

  const {
    filters: {byIncludeAttachments, byIsVendorData, byAlreadyRead},
    reducers: {groupByVendorEmail},
    actions: {generateSpreadsheets},
    extras: {tempFolder, invalidStructureFolder},
  } = _getUtilitiesToFilterEmails(folder);

  console.warn(tryingToGetOpenOrdersFrom(Session.getActiveUser().getEmail()));

  // Get list of all attachments where filter condition is true
  // and an action to store it in Firebase
  // This method take a lot of time to execute, should be optimized
  const results = GmailApp.search(query).map(mail => {
    const mailFolder = tempFolder.createFolder(mail.getFirstMessageSubject());

    return mail
      .getMessages()
      .filter(byIsVendorData)
      .filter(byIncludeAttachments)
      .filter(byAlreadyRead)
      .map(message => generateSpreadsheets(message, mailFolder));
  });

  const [createMailRecordActions, attachments] = results.flat().reduce(
    (acc, [action, attachment]) => {
      const actions = acc[0].concat(action);
      const attachments = acc[1].concat(attachment);
      return [actions, attachments];
    },
    [[], []] as [(() => void)[], ByEmailSpreadsheets[]]
  );

  console.log(totalReadMessages(createMailRecordActions.length));

  if (!attachments.length && !createMailRecordActions.length)
    console.log(noNewEmailsWasFound());

  // Get all attachments grouped by sender email in an object
  const attachmentsByVendor = [attachments].reduce(groupByVendorEmail, {});

  // In case all files extracted are readable, delete unreadable files store folder
  if (!invalidStructureFolder.getFiles().hasNext())
    invalidStructureFolder.setTrashed(true);

  // Create a user friendly file for each valid file to read
  // This data will be sended to a consolidator method
  const spreadsheetsByVendor = Object.entries(attachmentsByVendor).reduce(
    (acc, [vendorEmail, files]) => {
      const vendorFiles = files.map(file => {
        const {purchasesFolder, repairsFolder} =
          _getPurchasesAndRepairsFolders(folder);
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

  if (!COMMON.DEV_MODE())
    evaluateByEmailSpreadsheets(spreadsheetsByVendor, createMailRecordActions);
}

export {sendSheetToVendor, sendEmail, getOpenOrdersFromVendors};
