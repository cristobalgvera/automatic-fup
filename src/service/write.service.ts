import {TEMPLATE} from '../config';
import {ColumnNumbers} from '../util/interface/column-numbers.interface';
import {PurchaseOrder} from '../util/schema/purchase-order.schema';
import {purchaseOrderService} from './purchase-order.service';
type Sheet = GoogleAppsScript.Spreadsheet.Sheet;

function writeInSheet(
  vendorSheet: Sheet,
  vendorData: string[],
  columnNumbers: ColumnNumbers,
  isPurchase = true
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

  vendorSheet
    .getRange(3, templatePurchaseOrderColumn, vendorData.length)
    .setValues(vendorRoNumbers);
  vendorSheet
    .getRange(3, templatePartNumberColumn, vendorData.length)
    .setValues(vendorPartNumbers);

  // Purchases have no line numbers
  if (!isPurchase) vendorSheet.deleteColumns(templateLineColumn, 1);
  else {
    // Set data in the same way of PO or part numbers
    const vendorLines = vendorData.map(data => [data[lineColumn]]);
    vendorSheet
      .getRange(3, templateLineColumn, vendorData.length)
      .setValues(vendorLines);
  }

  // Clean sheet deleting empty ending rows
  const lastRowNumber = vendorSheet.getLastRow();
  vendorSheet.deleteRows(
    lastRowNumber + 1,
    TEMPLATE.UTIL.INITIAL_ROWS - lastRowNumber
  );

  SpreadsheetApp.flush();
  updateFupData();
}

function updateFupData() {
  const [purchases, repairs] = purchaseOrderService.getPurchaseOrdersToUpdate();

  console.log({purchases, repairs});
}

export {writeInSheet};
