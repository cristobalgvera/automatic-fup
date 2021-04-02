import { FOLDER_ID, UI, TEMPLATE, COMMON } from '../../config/app.settings';
import Folder = GoogleAppsScript.Drive.Folder;
import File = GoogleAppsScript.Drive.File;
import MimeType = GoogleAppsScript.Base.MimeType;
import { removeExtension } from './utility.service';
import Blob = GoogleAppsScript.Base.Blob;

function getTemplateAndCreateFolder() {
    const folder = DriveApp.getFolderById(FOLDER_ID.REGISTRIES);

    const registriesFolderName = UI.FOLDER.REGISTRIES.getName();

    const templateFile = DriveApp.getFileById(TEMPLATE.ID);
    const registriesFolder = folder.createFolder(registriesFolderName);

    return { templateFile, registriesFolder };
}

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

    // Template file to write vedors data
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
        // In case of failure, something can happen... not implemented
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
        consolidated.deleteRows(consolidated.getLastRow(), TEMPLATE.UTIL.INITIAL_ROWS - 1);
    } catch (e) {
        console.error(e);
    }

}

function createChildFolderFromFolderId( folderId: string, name: string ) {
    return DriveApp.getFolderById(folderId).createFolder(name);
}

function _setBaseData( isPurchase: boolean ) {
    return {
        openOrdersId: isPurchase ? FOLDER_ID.PURCHASE_ORDERS : FOLDER_ID.REPAIR_ORDERS,
        folderName: UI.FOLDER.CONSOLIDATED.getName(isPurchase),
        consolidatedFileName: UI.FILE.CONSOLIDATED.getName(isPurchase),
        numberOfColumns: isPurchase ? 8 : 7,
        vendorsFolderName: UI.FOLDER.CONSOLIDATED.VENDORS.getName(),
        purchaseOrderColumnName: TEMPLATE.COLUMN.PURCHASE_ORDER,
        consolidatedFolderId: isPurchase ? FOLDER_ID.CONSOLIDATED.PURCHASES : FOLDER_ID.CONSOLIDATED.REPAIRS,
    };
}

function excelToSheet( excelFile: File | Blob, folder: Folder ) {

    try {
        const blob = excelFile.getBlob();
        const fileName = removeExtension(excelFile.getName(), COMMON.UTIL.FILE_EXTENSION.XLSX);
        const resource: GoogleAppsScript.Drive.Schema.File = {
            title: fileName,
            // @ts-ignore
            mimeType: MimeType.GOOGLE_SHEETS,
            parents: [{ id: folder.getId() }],
        };

        const file = Drive.Files.insert(resource, blob);
        return SpreadsheetApp.openById(file.id);
    } catch (f) {
        console.error(f.toString());
    }
}

function sheetToExcel( fileId: string, name: string ) {
    try {
        const url = `https://docs.google.com/feeds/download/spreadsheets/Export?key=${fileId}&exportFormat=${COMMON.UTIL.FILE_EXTENSION.XLSX}`;
        const params = {
            headers: {
                'Authorization': `Bearer ${ScriptApp.getOAuthToken()}`,
            },
            muteHttpExceptions: true,
        };

        return UrlFetchApp.fetch(url, params).getBlob().setName(name + `.${COMMON.UTIL.FILE_EXTENSION.XLSX}`);
    } catch (e) {
        console.error(e.toString());
    }
}

export {
    consolidateOpenOrders,
    createChildFolderFromFolderId,
    getTemplateAndCreateFolder,
    sheetToExcel,
    excelToSheet,
};
