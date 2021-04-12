import {COMMON, FOLDER_ID, TEMPLATE, UI} from '../config';
import {removeExtension} from './utility.service';
import {GroupedVendors} from '../util/interface/grouped-vendors.interface';
import {ColumnNumbers} from '../util/interface/column-numbers.interface';
import {sendEmail} from './mail.service';
import {VendorContact} from '../util/interface/vendor-contact.interface';
import {getRepairsInitialData} from './read.service';
import Folder = GoogleAppsScript.Drive.Folder;
import File = GoogleAppsScript.Drive.File;
import SchemaFile = GoogleAppsScript.Drive.Schema.File;
import MimeType = GoogleAppsScript.Base.MimeType;
import Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;

function getTemplateAndCreateFolderForRegistries() {
  // Parent folder to store registries
  const folder = DriveApp.getFolderById(FOLDER_ID.REGISTRIES);
  const templateSpreadsheet = SpreadsheetApp.openById(TEMPLATE.ID);

  // Folder to store new registries located in parent folder
  const registriesFolder = folder.createFolder(UI.FOLDER.REGISTRIES.getName());

  return {templateSpreadsheet, registriesFolder};
}

const _setBaseData = (isPurchase: boolean) => ({
  openOrdersId: isPurchase
    ? FOLDER_ID.TO_CONSOLIDATE.PURCHASES
    : FOLDER_ID.TO_CONSOLIDATE.REPAIRS,
  folderName: UI.FOLDER.CONSOLIDATED.getName(isPurchase),
  consolidatedFileName: UI.FILE.CONSOLIDATED.getName(isPurchase),
  numberOfColumns: isPurchase ? 8 : 7,
  vendorsFolderName: UI.FOLDER.CONSOLIDATED.VENDORS.getName(),
  purchaseOrderColumnName: TEMPLATE.COLUMN.PURCHASE_ORDER,
  consolidatedFolderId: isPurchase
    ? FOLDER_ID.CONSOLIDATED.PURCHASES
    : FOLDER_ID.CONSOLIDATED.REPAIRS,
});

function consolidateOpenOrders(isPurchase = true) {
  const {
    consolidatedFileName,
    folderName,
    numberOfColumns,
    openOrdersId,
    vendorsFolderName,
    purchaseOrderColumnName,
    consolidatedFolderId,
  } = _setBaseData(isPurchase);

  // Folder to store consolidated data
  const purchasesFolder = createChildFolderFromFolderId(
    consolidatedFolderId,
    folderName
  );

  // Folder where data is searched
  const purchasesOpenOrdersFolder = DriveApp.getFolderById(openOrdersId);

  // Template file to write vendors data
  const templateFile = DriveApp.getFileById(TEMPLATE.ID)
    .makeCopy()
    .setName(consolidatedFileName);

  // Create copy of template to use in this iteration
  purchasesFolder.addFile(templateFile);
  const consolidated = SpreadsheetApp.open(templateFile).getSheets()[0];

  // Column 'line' is not used in repair context
  if (!isPurchase) consolidated.deleteColumn(2);

  // Insert column to write vendor name
  consolidated.insertColumnBefore(1);

  // Create a folder to store vendors unique file (just structure)
  const vendorsFolder = purchasesFolder.createFolder(vendorsFolderName);

  // Get files stream of each vendor file of defined data folder
  const files = purchasesOpenOrdersFolder.getFiles();

  while (files.hasNext()) {
    // In case of failure, something can happen... not implemented yet
    try {
      // Point to Excel file to convert
      const excelFile = files.next();
      const file = excelToSheet(excelFile, vendorsFolder);
      const fileName = removeExtension(
        excelFile.getName(),
        COMMON.UTIL.FILE_EXTENSION.XLSX
      );
      console.log(fileName);

      // Select sheet to map data
      const sheet = file.getSheets()[0];

      // Find PO column number if sheet columns was modified
      const poNumberColumnNumber =
        sheet
          .getRange(2, 1, 1, sheet.getLastColumn())
          .getValues()[0]
          .indexOf(purchaseOrderColumnName) + 1;

      // Minus header rows
      const numberOfRows = sheet.getLastRow() - 2;

      // First no data row
      const consolidatedFirstEmptyRow = consolidated.getLastRow() + 1;

      // Concat file name to identify vendor specific data
      const values = sheet
        .getRange(3, poNumberColumnNumber, numberOfRows, numberOfColumns)
        .getValues()
        .map(row => [fileName].concat(row));

      // Insert rows at the end of consolidated and add vendor data
      consolidated
        .insertRowsAfter(consolidatedFirstEmptyRow, numberOfRows)
        .getRange(
          consolidatedFirstEmptyRow,
          1,
          numberOfRows,
          consolidated.getLastColumn()
        )
        .setValues(values);

      // Update consolidated sheet in case of delay
      SpreadsheetApp.flush();
    } catch (e) {
      console.error(e.toString());
    }
  }

  try {
    // Delete all unused rows (may fail if template file is dirty)
    consolidated.deleteRows(
      consolidated.getLastRow() + 1,
      TEMPLATE.UTIL.INITIAL_ROWS - 2
    );
  } catch (e) {
    console.error('ConsolidateOpenOrders:', e);
  }
}

function createChildFolderFromFolderId(folderId: string, name: string) {
  return DriveApp.getFolderById(folderId).createFolder(name);
}

function excelToSheet(excelFile: File, folder: Folder) {
  const blob = excelFile.getBlob();
  const fileName = removeExtension(
    excelFile.getName(),
    COMMON.UTIL.FILE_EXTENSION.XLSX
  );

  // Define a Sheet file to convert Excel file into
  const resource: SchemaFile = {
    title: fileName,
    mimeType: MimeType.GOOGLE_SHEETS,
    parents: [{id: folder.getId()}],
  };

  try {
    const file = Drive.Files?.insert(resource, blob);

    // Variable file should return his id of creation (this may fail)
    return SpreadsheetApp.openById(file.id);
  } catch (f) {
    console.error(f.toString());
    return null;
  }
}

function sheetToExcel(vendorSpreadsheet: Spreadsheet, name: string) {
  // Google's URL to convert sheet file to Excel one
  const url = `https://docs.google.com/feeds/download/spreadsheets/Export?key=${vendorSpreadsheet.getId()}&exportFormat=${
    COMMON.UTIL.FILE_EXTENSION.XLSX
  }`;
  const params = {
    headers: {Authorization: `Bearer ${ScriptApp.getOAuthToken()}`},
    muteHttpExceptions: true,
  };

  try {
    return UrlFetchApp.fetch(url, params)
      .getBlob()
      .setName(`${name}.${COMMON.UTIL.FILE_EXTENSION.XLSX}`);
  } catch (e) {
    console.error(e.toString());
    return null;
  }
}

function createSheetFiles(
  vendors: GroupedVendors,
  vendorsContact: VendorContact[],
  templateSpreadsheet: Spreadsheet,
  registriesFolder: Folder,
  columnNumbers: ColumnNumbers
) {
  return Object.entries(vendors).map(vendor => {
    const [vendorId, vendorData] = vendor;
    const vendorContact = vendorsContact.find(
      contact => contact.id === vendorId
    );

    const vendorSpreadsheet = templateSpreadsheet.copy(vendorContact.name);
    registriesFolder.addFile(DriveApp.getFileById(vendorSpreadsheet.getId()));

    // Point to created spreadsheet sheet
    const vendorSheet = vendorSpreadsheet.getSheetByName(
      TEMPLATE.SHEET.PURCHASE
    );

    // For each vendor create a send email to him action to return
    return () =>
      sendEmail(
        vendorSheet,
        vendorData,
        columnNumbers,
        vendorContact,
        vendorSpreadsheet
      );
  });
}

// To get vendors dictionary
function groupVendors() {
  const mainFolder = DriveApp.getFolderById(FOLDER_ID.MAIN);
  const {expectedSheet, vendorNameColumnNumber} = getRepairsInitialData();

  const vendorDictionary = expectedSheet
    .getRange(2, vendorNameColumnNumber + 1, expectedSheet.getLastRow() - 1, 2)
    .getValues()
    .map(([name, responsible]) => [
      responsible.toLocaleUpperCase().trim(),
      name.toLocaleUpperCase(),
    ]) as string[][];

  const vendors = vendorDictionary.reduce((acc, [name, responsible]) => {
    acc[responsible] ??= [];
    acc[responsible].push(name);
    return acc;
  }, {});

  const vendorsArray = Object.keys(vendors).map(vendor => [vendor]);

  const spreadsheet = SpreadsheetApp.create('Dictionary');
  mainFolder.addFile(DriveApp.getFileById(spreadsheet.getId()));

  const contactsSheet = spreadsheet.insertSheet('Contacts');
  const dictionarySheet = spreadsheet.insertSheet('Dictionary');

  contactsSheet.getRange(1, 1, vendorsArray.length, 1).setValues(vendorsArray);
  dictionarySheet
    .getRange(1, 1, vendorDictionary.length, 2)
    .setValues(vendorDictionary);
}

export {
  consolidateOpenOrders,
  createChildFolderFromFolderId,
  getTemplateAndCreateFolderForRegistries,
  sheetToExcel,
  excelToSheet,
  createSheetFiles,
};
