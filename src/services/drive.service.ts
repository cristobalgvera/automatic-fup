import { COMMON, FOLDER_ID, TEMPLATE, UI } from '../../config';
import { removeExtension } from './utility.service';
import { GroupedVendors } from '../util/interfaces/grouped-vendors';
import { ColumnNumbers } from '../util/interfaces/column-numbers';
import { sendEmail } from './mail.service';
import { VendorContact } from '../util/interfaces/vendor-contact';
import Folder = GoogleAppsScript.Drive.Folder;
import File = GoogleAppsScript.Drive.File;
import Blob = GoogleAppsScript.Base.Blob;
import SchemaFile = GoogleAppsScript.Drive.Schema.File;
import MimeType = GoogleAppsScript.Base.MimeType;
import Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;

function getTemplateAndCreateFolder() {
    // Parent folder to store registries
    const folder = DriveApp.getFolderById(FOLDER_ID.REGISTRIES);
    const templateSpreadsheet = SpreadsheetApp.openById(TEMPLATE.ID);

    // Folder to store new registries located in parent folder
    const registriesFolder = folder.createFolder(UI.FOLDER.REGISTRIES.getName());

    return { templateSpreadsheet: templateSpreadsheet, registriesFolder };
}

const _setBaseData = ( isPurchase: boolean ) => ({
    openOrdersId: isPurchase ? FOLDER_ID.TO_CONSOLIDATE.PURCHASES : FOLDER_ID.TO_CONSOLIDATE.REPAIRS,
    folderName: UI.FOLDER.CONSOLIDATED.getName(isPurchase),
    consolidatedFileName: UI.FILE.CONSOLIDATED.getName(isPurchase),
    numberOfColumns: isPurchase ? 8 : 7,
    vendorsFolderName: UI.FOLDER.CONSOLIDATED.VENDORS.getName(),
    purchaseOrderColumnName: TEMPLATE.COLUMN.PURCHASE_ORDER,
    consolidatedFolderId: isPurchase ? FOLDER_ID.CONSOLIDATED.PURCHASES : FOLDER_ID.CONSOLIDATED.REPAIRS,
});

function consolidateOpenOrders( isPurchase: boolean = true ) {
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
    const purchasesFolder = createChildFolderFromFolderId(consolidatedFolderId, folderName);

    // Folder where data is searched
    const purchasesOpenOrdersFolder = DriveApp.getFolderById(openOrdersId);

    // Template file to write vendors data
    const templateFile = DriveApp.getFileById(TEMPLATE.ID)
        .makeCopy()
        .setName(consolidatedFileName);

    // Create copy of template to use in this iteration
    purchasesFolder.addFile(templateFile);
    const consolidated = SpreadsheetApp.open(templateFile)
        .getSheets()[0];

    // Column 'line' is not used in repair context
    if (!isPurchase) consolidated.deleteColumn(2);

    // Inser column to write vendor name
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
            const fileName = removeExtension(excelFile.getName(), COMMON.UTIL.FILE_EXTENSION.XLSX);
            console.log(fileName);

            // Select sheet to map data
            const sheet = file.getSheets()[0];

            // Find PO column number if sheet columns was modified
            const poNumberColumnNumber = sheet.getRange(2, 1, 1, sheet.getLastColumn())
                .getValues()[0]
                .indexOf(purchaseOrderColumnName) + 1;

            // Minus header rows
            const numberOfRows = sheet.getLastRow() - 2;

            // First no data row
            const consolidatedFirstEmptyRow = consolidated.getLastRow() + 1;

            // Concat file name to identify vendor specific data
            const values = sheet.getRange(3, poNumberColumnNumber, numberOfRows, numberOfColumns)
                .getValues()
                .map(row => [fileName].concat(row));

            // Insert rows at the end of consolidated and add vendor data
            consolidated.insertRowsAfter(consolidatedFirstEmptyRow, numberOfRows)
                .getRange(consolidatedFirstEmptyRow, 1, numberOfRows, consolidated.getLastColumn())
                .setValues(values);

            // Update consolidated sheet in case of delay
            SpreadsheetApp.flush();
        } catch (e) {
            console.error(e.toString());
        }
    }

    try {
        // Delete all unused rows (may fail if template file is dirty)
        consolidated.deleteRows(consolidated.getLastRow() + 1, TEMPLATE.UTIL.INITIAL_ROWS - 2);
    } catch (e) {
        console.error(e);
    }

}

function createChildFolderFromFolderId( folderId: string, name: string ) {
    return DriveApp.getFolderById(folderId).createFolder(name);
}

function excelToSheet( excelFile: File | Blob, folder: Folder ) {
    const blob = excelFile.getBlob();
    const fileName = removeExtension(excelFile.getName(), COMMON.UTIL.FILE_EXTENSION.XLSX);

    // Define a Sheet file to convert Excel file into
    const resource: SchemaFile = {
        title: fileName,
        // @ts-ignore because mimeType doesn't recognize his own MimeType enum
        mimeType: MimeType.GOOGLE_SHEETS,
        parents: [{ id: folder.getId() }],
    };

    try {
        const file = Drive.Files.insert(resource, blob);

        // Variable file should return his id of creation (this may fail)
        return SpreadsheetApp.openById(file.id);
    } catch (f) {
        console.error(f.toString());
    }
}

function sheetToExcel( vendorSpreadsheet: Spreadsheet, name: string ) {
    // Google's URL to convert sheet file to Excel one
    const url = `https://docs.google.com/feeds/download/spreadsheets/Export?key=${vendorSpreadsheet.getId()}&exportFormat=${COMMON.UTIL.FILE_EXTENSION.XLSX}`;
    const params = {
        headers: { Authorization: `Bearer ${ScriptApp.getOAuthToken()}` },
        muteHttpExceptions: true,
    };

    try {
        return UrlFetchApp.fetch(url, params)
            .getBlob()
            .setName(name + `.${COMMON.UTIL.FILE_EXTENSION.XLSX}`);
    } catch (e) {
        console.error(e.toString());
    }
}

function createSheetFiles(
    vendors: GroupedVendors,
    vendorsContact: VendorContact[],
    templateSpreadsheet: Spreadsheet,
    registriesFolder: Folder,
    columnNumbers: ColumnNumbers,
) {
    return Object.entries(vendors).map(vendor => {
        const [vendorId, vendorData] = vendor;
        const vendorContact = vendorsContact.find(contact => contact.id === vendorId);

        const vendorSpreadsheet = templateSpreadsheet.copy(vendorContact.name);
        registriesFolder.addFile(DriveApp.getFileById(vendorSpreadsheet.getId()));

        // Point to created spreadsheet sheet
        const vendorSheet = vendorSpreadsheet.getSheetByName(TEMPLATE.SHEET.PURCHASE);

        // For each vendor create a send email to him action to return
        return () => sendEmail(vendorSheet, vendorData, columnNumbers, vendorContact, vendorSpreadsheet);
    });
}

export {
    consolidateOpenOrders,
    createChildFolderFromFolderId,
    getTemplateAndCreateFolder,
    sheetToExcel,
    excelToSheet,
    createSheetFiles,
};
