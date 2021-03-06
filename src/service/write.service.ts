import {COMMON, DB, TEMPLATE} from '../config';
import {DATA_ORIGIN} from '../util/enum/data-origin.enum';
import {LOG_STATE} from '../util/enum/log-state.enum';
import {ColumnNumbers} from '../util/interface/column-numbers.interface';
import {PurchaseOrder} from '../util/schema/purchase-order.schema';
import {
  emptyAutomaticColumns,
  errorChecking,
  errorUpdatingSendDate,
  fillingAutomaticallySendColumn,
  howManyVendorsChecked,
  noOpenOrdersToBeUpdated,
  updatingOpenOrders,
  updatingSendDate,
} from './message.service';
import {
  _defineResponsible,
  _updatePurchases,
  _updateRepairs,
  _utilitiesToSendPurchaseOrders,
} from '../util/service/write.utility';
import {checkWorker} from './config.service';
import {purchaseOrderService} from './db/purchase-order.service';
import {storeData} from './analytics.service';
type Sheet = GoogleAppsScript.Spreadsheet.Sheet;
type SheetData = (string | boolean | Date | number)[][];

function writeInSheet(
  vendorSheet: Sheet,
  vendorData: string[][],
  columnNumbers: ColumnNumbers,
  isPurchase = true
) {
  const {
    templatePurchaseOrderColumn,
    templatePartNumberColumn,
    templateLineColumn,
    templateQtdPendenteColumn,
  } = columnNumbers;

  const [roNumbers, partNumbers, lines, qtdPendentes, analytics] =
    _utilitiesToSendPurchaseOrders(columnNumbers, vendorData) as [
      string[][],
      string[][],
      string[][],
      string[][],
      PurchaseOrder[]
    ];

  vendorSheet
    .getRange(3, templatePurchaseOrderColumn, vendorData.length)
    .setValues(roNumbers);

  vendorSheet
    .getRange(3, templatePartNumberColumn, vendorData.length)
    .setValues(partNumbers);

  // Purchases have no line numbers
  if (isPurchase) {
    // Set data in the same way of PO or part numbers
    vendorSheet
      .getRange(3, templateLineColumn, vendorData.length)
      .setValues(lines);

    vendorSheet
      .getRange(3, templateQtdPendenteColumn, vendorData.length)
      .setValues(qtdPendentes);
  }

  // Clean sheet deleting empty ending rows
  const lastRowNumber = vendorSheet.getLastRow();
  vendorSheet.deleteRows(
    lastRowNumber + 1,
    TEMPLATE.UTIL.INITIAL_ROWS - lastRowNumber
  );

  SpreadsheetApp.flush();
  return analytics;
}

function updateDbSheetSendDates(
  mailedIds: string[],
  checkedIds: string[],
  dataOrigin: DATA_ORIGIN,
  shouldUpdateDates = true,
  when?: Date
) {
  const spreadsheet = SpreadsheetApp.openById(DB.ID);
  const sheet = spreadsheet.getSheetByName(
    !COMMON.DEV_MODE() ? DB.SHEET.VENDOR : DB.SHEET.DEV
  );
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  const sendDateColumn = headers.indexOf(DB.COLUMN.SEND_DATE);
  const automaticallySendEmailColumn = headers.indexOf(
    DB.COLUMN.AUTOMATICALLY_SEND_EMAIL
  );

  const data: SheetData = sheet.getDataRange().getValues();

  const dbIds = data.reduce(
    (acc, [key], i) => ({...acc, [String(key)]: i}),
    {}
  );

  const updateDate = when ?? new Date();

  console.log(updatingSendDate());
  checkedIds.forEach(id => {
    const rowNumber = dbIds[id];
    if (!rowNumber && rowNumber !== 0) {
      console.error(errorUpdatingSendDate(id));
      return null;
    }

    if (shouldUpdateDates && mailedIds.includes(id))
      data[rowNumber][sendDateColumn] = updateDate;

    data[rowNumber][automaticallySendEmailColumn] = false;
  });

  SpreadsheetApp.flush();

  console.log({checked: checkedIds.length, mailed: mailedIds.length});

  console.log(howManyVendorsChecked(checkedIds.length));
  updateAutomaticallySendEmailColumn(
    sheet,
    dataOrigin,
    data,
    dbIds,
    automaticallySendEmailColumn
  );
}

function updateAutomaticallySendEmailColumn(
  sheet: Sheet,
  dataOrigin: DATA_ORIGIN,
  data: SheetData,
  dbIds?: {},
  automaticallySendEmailColumn?: number
) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  const typeColumn = headers.indexOf(DB.COLUMN.VENDOR_TYPE);
  const toCheckColumn =
    automaticallySendEmailColumn ??
    headers.indexOf(DB.COLUMN.AUTOMATICALLY_SEND_EMAIL);
  const sendEmailColumn = headers.indexOf(DB.COLUMN.SEND_EMAIL);

  const wasSend = (row: (string | boolean)[]) =>
    !row[toCheckColumn] || (!row[sendEmailColumn] && row[toCheckColumn]);

  const needUpdate = data
    .filter(row => row[typeColumn] === dataOrigin)
    .every(wasSend);

  if (!needUpdate) {
    sheet.getDataRange().setValues(data);
    return;
  }

  console.log(emptyAutomaticColumns());
  console.warn(fillingAutomaticallySendColumn(LOG_STATE.START));
  const idColumn = headers.indexOf(DB.COLUMN.ID);
  const ids =
    dbIds ?? data.reduce((acc, [key], i) => ({...acc, [String(key)]: i}), {});

  data.forEach(row => {
    const correctDataOrigin = row[typeColumn] === dataOrigin;
    if (!correctDataOrigin) return;

    const id = row[idColumn] as string;
    const rowNumber = ids[id];
    if (!rowNumber && rowNumber !== 0) {
      console.error(errorChecking(id));
      return;
    }

    row[toCheckColumn] = true;
  });

  sheet.getDataRange().setValues(data);

  switch (dataOrigin) {
    case DATA_ORIGIN.PURCHASE:
      checkWorker.uncheckAutomaticPurchases();
      break;
    case DATA_ORIGIN.REPAIR:
      checkWorker.uncheckAutomaticRepairs();
      break;
  }

  console.warn(fillingAutomaticallySendColumn(LOG_STATE.END));
}

function updateFupData() {
  const [purchases, repairs] = purchaseOrderService.getToUpdatePurchaseOrders();
  let updatedPurchases: PurchaseOrder[], updatedRepairs: PurchaseOrder[];

  if (!purchases.length && !repairs.length) {
    console.warn(noOpenOrdersToBeUpdated());
    return;
  }

  if (purchases.length) {
    console.warn(updatingOpenOrders(LOG_STATE.START, true));
    updatedPurchases = _updatePurchases(purchases);
    console.warn(updatingOpenOrders(LOG_STATE.END, true));
  }

  if (repairs.length) {
    console.warn(updatingOpenOrders(LOG_STATE.START, false));
    updatedRepairs = _updateRepairs(repairs);
    console.warn(updatingOpenOrders(LOG_STATE.END, false));
  }

  _defineResponsible(); // Used to define ambiguous 'Procurement / Log??stica' responsible

  storeData([...(updatedPurchases ?? []), ...(updatedRepairs ?? [])]);

  if (updatedPurchases?.length)
    purchaseOrderService.setUpdatedPurchaseOrders(updatedPurchases);

  if (updatedRepairs?.length)
    purchaseOrderService.setUpdatedPurchaseOrders(updatedRepairs);
}

export {writeInSheet, updateFupData, updateDbSheetSendDates};
