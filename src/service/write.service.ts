import {PURCHASE_DATA, REPAIR_DATA, TEMPLATE} from '../config';
import {DATA_ORIGIN} from '../util/enum/data-origin.enum';
import {ColumnNumbers} from '../util/interface/column-numbers.interface';
import {PurchaseOrder} from '../util/schema/purchase-order.schema';
import {_getFupInitialData} from '../util/service/read.utility';
import {_utilitiesToUpdateFupData} from '../util/service/write.utility';
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
  if (isPurchase) {
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
}

function updateFupData() {
  const [purchases, repairs] = purchaseOrderService.getToUpdatePurchaseOrders();
  if (purchases.length) {
    const updatedPurchases = updatePurchases(purchases);
    purchaseOrderService.setUpdatedPurchaseOrders(updatedPurchases);
  }
}

function updatePurchases(purchaseOrders: PurchaseOrder[]) {
  const {
    expectedSheet,
    utils: {headerNumber: headers},
  } = _getFupInitialData(DATA_ORIGIN.PURCHASE);

  const rowNumberByKey: {[name: string]: number} = expectedSheet
    .getRange(1, 1, expectedSheet.getLastRow())
    .getValues()
    .reduce((acc, [key], i) => ({...acc, [key]: i + 1}), {});

  const firstColumnToEdit =
    headers[PURCHASE_DATA.UTIL.VENDOR_DATA_COLUMNS.PO_STATUS] + 1;
  const lastColumnToEdit =
    headers[PURCHASE_DATA.UTIL.VENDOR_DATA_COLUMNS.COMMENTS] + 1;

  const totalColumns = lastColumnToEdit - firstColumnToEdit + 1;

  const {
    actions: {updateSheet},
  } = _utilitiesToUpdateFupData(
    expectedSheet,
    rowNumberByKey,
    firstColumnToEdit,
    totalColumns
  );

  return purchaseOrders.map(updateSheet).filter(purchaseOrder => purchaseOrder);
}

function updateRepairs(repairs: PurchaseOrder[]) {
  const spreadsheet = SpreadsheetApp.openById(REPAIR_DATA.ID);
  const sheet = spreadsheet.getSheetByName(REPAIR_DATA.SHEET.ACTUAL);
}

export {writeInSheet};
