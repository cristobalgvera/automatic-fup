import { TEMPLATE } from '../../config';
import Sheet = GoogleAppsScript.Spreadsheet.Sheet;
import { ColumnNumbers } from '../util/interfaces/column-numbers';

function writeInSheet(
    vendorSheet: Sheet,
    vendorData: string[],
    columnNumbers: ColumnNumbers,
    noLineColumn: boolean = false,
) {
    const {
        templatePurchaseOrderColumn,
        templatePartNumberColumn,
        roNumberColumn,
        partNumberColumn,
        lineColumn,
        templateLineColumn,
    } = columnNumbers;

    // Get all PO numbers of this vendor
    const vendorRoNumbers = vendorData.map(data => [data[roNumberColumn]]);

    // Get all part numbers of this vendor
    const vendorPartNumbers = vendorData.map(data => [data[partNumberColumn]]);

    vendorSheet.getRange(3, templatePurchaseOrderColumn, vendorData.length)
        .setValues(vendorRoNumbers);
    vendorSheet.getRange(3, templatePartNumberColumn, vendorData.length)
        .setValues(vendorPartNumbers);

    // Purchases have no line numbers
    if (noLineColumn)
        vendorSheet.deleteColumns(templateLineColumn, 1);
    else {
        // Set data in the same way of PO or part numbers
        const vendorLines = vendorData.map(data => [data[lineColumn]]);
        vendorSheet.getRange(3, templateLineColumn, vendorData.length)
            .setValues(vendorLines);
    }

    // Clean sheet deleting empty ending rows
    const lastRowNumber = vendorSheet.getLastRow();
    vendorSheet.deleteRows(lastRowNumber + 1, TEMPLATE.UTIL.INITIAL_ROWS - lastRowNumber);

    SpreadsheetApp.flush();
}

export { writeInSheet };
