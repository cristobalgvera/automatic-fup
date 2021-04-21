import {COMMON, DB, PURCHASE_DATA, REPAIR_DATA, TEMPLATE} from '../config';
import {DATA_ORIGIN} from '../util/enum/data-origin.enum';
import {ColumnNumbers} from '../util/interface/column-numbers.interface';
import {PurchaseOrder} from '../util/schema/purchase-order.schema';
import {_getFupInitialData} from '../util/service/read.utility';
import {_utilitiesToUpdateFupData} from '../util/service/write.utility';
import {purchaseOrderService} from './db/purchase-order.service';
type Sheet = GoogleAppsScript.Spreadsheet.Sheet;

function writeInSheet(
  vendorSheet: Sheet,
  vendorData: string[][],
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

function updateDbSheetSendDates(ids: string[], when?: Date) {
  const spreadsheet = SpreadsheetApp.openById(DB.ID);
  const sheet = spreadsheet.getSheetByName(
    !COMMON.DEV_MODE() ? DB.SHEET.VENDOR : DB.SHEET.DEV
  );
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  const sendDateColumn = headers.indexOf(DB.COLUMN.SEND_DATE) + 1;
  const automaticallySendEmailColumn =
    headers.indexOf(DB.COLUMN.AUTOMATICALLY_SEND_EMAIL) + 1;

  const dbIds = sheet
    .getRange(1, 1, sheet.getLastRow())
    .getValues()
    .reduce((acc, [key], i) => ({...acc, [key]: i + 1}), {});

  const updateDate = when ?? new Date();

  ids.forEach(id => {
    const rowNumber = dbIds[id];
    if (!rowNumber) {
      console.error(`Error while updating send date of ${id}: ID not found`);
      return null;
    }

    console.log(`Updating ${id} send date`);
    sheet.getRange(rowNumber, sendDateColumn).setValue(updateDate);
    sheet.getRange(rowNumber, automaticallySendEmailColumn).uncheck();
  });
}

function updateFupData() {
  const [purchases, repairs] = purchaseOrderService.getToUpdatePurchaseOrders();
  if (purchases.length) {
    console.warn('UPDATING OPEN ORDERS OF PURCHASES DATA START');
    const updatedPurchases = _updatePurchases(purchases);
    purchaseOrderService.setUpdatedPurchaseOrders(updatedPurchases);
    console.warn('UPDATING OPEN ORDERS OF PURCHASES DATA END');
  }

  if (repairs.length) {
    console.warn('UPDATING OPEN ORDERS OF REPAIRS DATA START');
    const updatedRepairs = _updateRepairs(repairs);
    purchaseOrderService.setUpdatedPurchaseOrders(updatedRepairs);
    console.warn('UPDATING OPEN ORDERS OF REPAIRS DATA END');
  }
}

function _updatePurchases(purchaseOrders: PurchaseOrder[]) {
  const {
    expectedSheet,
    utils: {headerNumber: headers},
  } = _getFupInitialData(DATA_ORIGIN.PURCHASE);

  console.log('Retrieving purchases data');
  const rowNumberByKey: {[name: string]: number} = expectedSheet
    .getRange(1, 1, expectedSheet.getLastRow())
    .getValues()
    .reduce((acc, [key], i) => ({...acc, [key]: i + 1}), {});

  const firstColumnToEdit =
    headers[PURCHASE_DATA.UTIL.VENDOR_DATA_COLUMNS.PO_STATUS] + 1;
  const lastColumnToEdit =
    headers[PURCHASE_DATA.UTIL.VENDOR_DATA_COLUMNS.RESPONSIBLE] + 1;

  const totalColumns = lastColumnToEdit - firstColumnToEdit + 1;

  const {
    actions: {updateSheet},
  } = _utilitiesToUpdateFupData(
    expectedSheet,
    rowNumberByKey,
    firstColumnToEdit,
    totalColumns,
    true
  );

  console.log('Updating...');
  return purchaseOrders.map(updateSheet).filter(purchaseOrder => purchaseOrder);
}

function _updateRepairs(purchaseOrders: PurchaseOrder[]) {
  const spreadsheet = SpreadsheetApp.openById(REPAIR_DATA.FUP.ID);
  const sheet = spreadsheet.getSheetByName(REPAIR_DATA.FUP.SHEET.ACTUAL);

  const {
    keyColumn,
    firstColumnToEdit,
    lastColumnToEdit,
  }: {
    [column: string]: number;
  } = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .reduce(
      (acc, header, i) => {
        switch (header) {
          case REPAIR_DATA.FUP.COLUMN.RO_NUMBER:
            return {...acc, keyColumn: i + 1};
          case REPAIR_DATA.UTIL.VENDOR_DATA_COLUMNS.PO_STATUS:
            return {...acc, firstColumnToEdit: i + 1};
          case REPAIR_DATA.UTIL.VENDOR_DATA_COLUMNS.RESPONSIBLE:
            return {...acc, lastColumnToEdit: i + 1};
          default:
            return acc;
        }
      },
      {keyColumn: null, firstColumnToEdit: null, lastColumnToEdit: null}
    );

  const totalColumns = lastColumnToEdit - firstColumnToEdit + 1;

  console.log('Retrieving purchases data');
  const rowNumberByKey: {[name: string]: number} = sheet
    .getRange(1, keyColumn, sheet.getLastRow())
    .getValues()
    .reduce((acc, [key], i) => ({...acc, [key]: i + 1}), {});

  const {
    actions: {updateSheet},
  } = _utilitiesToUpdateFupData(
    sheet,
    rowNumberByKey,
    firstColumnToEdit,
    totalColumns,
    false
  );

  console.log('Updating...');
  return purchaseOrders.map(updateSheet).filter(purchaseOrder => purchaseOrder);
}
export {writeInSheet, updateFupData, updateDbSheetSendDates};
