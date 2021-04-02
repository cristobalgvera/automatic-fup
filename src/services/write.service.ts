import Sheet = GoogleAppsScript.Spreadsheet.Sheet;
import { ColumnNumbers } from '../util/interfaces/column-numbers';
import { TEMPLATE } from '../../config/app.settings';

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

    const vendorRoNumbers = vendorData.map(data => [data[roNumberColumn]]);
    const vendorPartNumbers = vendorData.map(data => [data[partNumberColumn]]);

    vendorSheet.getRange(3, templatePurchaseOrderColumn, vendorData.length)
        .setValues(vendorRoNumbers);
    vendorSheet.getRange(3, templatePartNumberColumn, vendorData.length)
        .setValues(vendorPartNumbers);

    if (noLineColumn)
        vendorSheet.deleteColumns(templateLineColumn, 1);
    else {
        const vendorLines = vendorData.map(data => [data[lineColumn]]);
        vendorSheet.getRange(3, templateLineColumn, vendorData.length)
            .setValues(vendorLines);
    }

    const firstUnusedRowNumber = vendorSheet.getLastRow() + 1;
    vendorSheet.deleteRows(firstUnusedRowNumber, TEMPLATE.UTIL.INITIAL_ROWS - firstUnusedRowNumber);

    SpreadsheetApp.flush();
}

export { writeInSheet };
