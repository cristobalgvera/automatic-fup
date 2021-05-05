import {ACTION} from '../enum/action.enum';
import {PO_STATUS} from '../enum/po-status.enum';
import {RESPONSIBLE} from '../enum/responsible.enum';
import {PurchaseOrder} from '../schema/purchase-order.schema';
import {
  notFoundPurchaseOrderInFup,
  retrievingData,
  updating,
  updatingPurchaseOrderInFup,
  updatingPurchaseResponsible,
  updatingRepairResponsible,
  updatingResponsible,
} from '../../service/message.service';
import {ColumnNumbers} from '../interface/column-numbers.interface';
import {ANALYTICS, PURCHASE_DATA, REPAIR_DATA} from '../../config';
import {DATA_ORIGIN} from '../enum/data-origin.enum';
import {_getFupInitialData} from './read.utility';
type Sheet = GoogleAppsScript.Spreadsheet.Sheet;

function _utilitiesToUpdateFupData(
  sheet: Sheet,
  rowNumberByKey: {[name: string]: number},
  firstColumnToEdit: number,
  totalColumns: number,
  isPurchase: boolean
) {
  const updateSheet = (purchaseOrder: PurchaseOrder) => {
    const {
      id,
      status,
      esd,
      shippedDate,
      qtyShipped,
      awb,
      comments,
      purchaseOrder: order,
    } = purchaseOrder;
    const rowNumber = rowNumberByKey[isPurchase ? id : order];
    if (!rowNumber) {
      console.error(notFoundPurchaseOrderInFup(purchaseOrder, isPurchase));
      const conflictive: PurchaseOrder = {...purchaseOrder};
      conflictive.audit.conflictive = true;
      return conflictive;
    }

    const [action, responsible] = _setResponsible(status, isPurchase);
    const vendorData = [
      [
        status,
        esd,
        shippedDate,
        qtyShipped,
        awb,
        comments,
        action ?? '',
        responsible ?? '',
      ],
    ];
    console.log(
      updatingPurchaseOrderInFup(rowNumber, purchaseOrder, isPurchase)
    );

    sheet
      .getRange(rowNumber, firstColumnToEdit, 1, totalColumns)
      .setValues(vendorData);

    sheet.getRange(rowNumber, firstColumnToEdit + totalColumns).uncheck(); // Uncheck management cell
    sheet
      .getRange(rowNumber, firstColumnToEdit + totalColumns + 1)
      .clearContent(); // Clear management date

    purchaseOrder.audit.updatedInSheet = true;
    return purchaseOrder;
  };

  return {actions: {updateSheet}};
}

function _utilitiesToSendPurchaseOrders(
  columnNumbers: ColumnNumbers,
  vendorData: string[][]
) {
  const {
    roNumberColumn,
    partNumberColumn,
    lineColumn,
    qtdPendenteColumn,
  } = columnNumbers;

  return vendorData.reduce(
    (acc, data) => {
      const rawLine = data[lineColumn];
      const rawQtdPendente = data[qtdPendenteColumn];

      const roNumber = [String(data[roNumberColumn])];
      const partNumber = [String(data[partNumberColumn])];
      const line = rawLine ? [String(rawLine)] : [undefined];
      const qtdPendente = rawQtdPendente
        ? [String(data[qtdPendenteColumn])]
        : [undefined];
      const key = `${roNumber[0]}${line[0] ?? 1}`;

      const roNumbers = acc[0].concat([roNumber]);
      const partNumbers = acc[1].concat([partNumber]);
      const lines = acc[2].concat([line]);
      const qtdPendentes = acc[3].concat([qtdPendente]);

      const analytics = acc[4].concat([
        {
          id: key,
          purchaseOrder: roNumber[0],
          line: +(line[0] ?? 1),
          qtyPending: qtdPendente[0] ? +qtdPendente[0] : null,
          partNumber: partNumber[0],
          vendorName: undefined,
          audit: {
            isPurchase: line[0] ? true : false,
            updatedInSheet: false,
          },
        },
      ]);

      return [roNumbers, partNumbers, lines, qtdPendentes, analytics];
    },
    [[], [], [], [], []]
  );
}

function _setResponsible(
  status: PO_STATUS,
  isPurchase: boolean
): [ACTION, RESPONSIBLE] {
  if (isPurchase)
    switch (status) {
      case PO_STATUS.NOT_RECEIVED:
        return [ACTION.SEND_PO_TO_VENDOR, RESPONSIBLE.PROCUREMENT];
      case PO_STATUS.CANCELLED:
        return [ACTION.MANAGE_B_PLAN, RESPONSIBLE.PROCUREMENT];
      case PO_STATUS.NOT_SHIPPED_YET:
        return [ACTION.SEND_ON_ESD, RESPONSIBLE.VENDOR];
      case PO_STATUS.AWAITING_ISSUED_BUYER:
        return [ACTION.RESPOND_REQUESTED_ISSUE, RESPONSIBLE.PROCUREMENT];
      case PO_STATUS.AWAITING_CIA_PAYMENT:
        return [ACTION.PROCESS_CIA, RESPONSIBLE.PROCUREMENT];
      case PO_STATUS.SHIPPED:
        return [ACTION.FINISH_IMPORT, RESPONSIBLE.PROCUREMENT_LOGISTIC];
      default:
        return [undefined, undefined];
    }
  else
    switch (status) {
      case PO_STATUS.NOT_RECEIVED:
        return [ACTION.GET_POD, RESPONSIBLE.LOGISTIC];
      case PO_STATUS.CORE_RETURN:
        return [ACTION.CLOSE_PO, RESPONSIBLE.PROCUREMENT];
      case PO_STATUS.TO_BE_QUOTED:
        return [ACTION.SEND_QUOTE, RESPONSIBLE.VENDOR];
      case PO_STATUS.AWAITING_QUOTE_APPROVAL:
        return [ACTION.APPROVE_QUOTE, RESPONSIBLE.PROCUREMENT];
      case PO_STATUS.AWAITING_CIA_PAYMENT:
        return [ACTION.SEND_VOUCHER, RESPONSIBLE.PROCUREMENT];
      case PO_STATUS.OTHER_CUSTOMER_HOLD:
        return [ACTION.FUP, RESPONSIBLE.PROCUREMENT];
      case PO_STATUS.UNDER_REPAIR_PROCESS:
        return [ACTION.FINISH_REPAIRS, RESPONSIBLE.VENDOR];
      case PO_STATUS.SHIPPED:
        return [ACTION.FINISH_IMPORT, RESPONSIBLE.PROCUREMENT_LOGISTIC];
      case PO_STATUS.SCRAPPED:
        return [ACTION.CLOSE_PO, RESPONSIBLE.PROCUREMENT];
      default:
        return [undefined, undefined];
    }
}

function _getAnalyticsData() {
  const analyticsSpreadsheet = SpreadsheetApp.openById(ANALYTICS.ID);
  const analyticsSheet = analyticsSpreadsheet.getSheetByName(
    ANALYTICS.SHEET.CONSOLIDATED_PROCUREMENT
  );

  const keys: string[] = analyticsSheet
    .getRange(2, 1, analyticsSheet.getLastRow())
    .getValues()
    .flat();

  return keys;
}

function _defineResponsible() {
  const keys = _getAnalyticsData();

  _defineRepairResponsible(keys);
  _definePurchaseResponsible(keys);
}

function _defineRepairResponsible(keys: string[]) {
  console.log(updatingRepairResponsible());

  const spreadsheet = SpreadsheetApp.openById(REPAIR_DATA.ID);
  const sheet = spreadsheet.getSheetByName(REPAIR_DATA.SHEET.ACTUAL);

  const data = sheet.getDataRange().getValues();
  const headers = data.splice(0, 1)[0];

  const responsibleCol = headers.indexOf(
    REPAIR_DATA.UTIL.VENDOR_DATA_COLUMNS.RESPONSIBLE
  );
  const poCol = headers.indexOf(REPAIR_DATA.COLUMN.RO_NUMBER);
  const partNumberCol = headers.indexOf(REPAIR_DATA.COLUMN.PART_NUMBER);

  const fupData = _defineProcurementOrLogisticResponsible(
    {data, headers},
    {responsibleCol, poCol, partNumberCol},
    keys
  );

  sheet.getRange(1, responsibleCol + 1, sheet.getLastRow()).setValues(fupData);
}

function _definePurchaseResponsible(keys: string[]) {
  console.log(updatingPurchaseResponsible());

  const spreadsheet = SpreadsheetApp.openById(PURCHASE_DATA.ID);
  const sheet = spreadsheet.getSheetByName(PURCHASE_DATA.SHEET.ACTUAL);

  const data = sheet.getDataRange().getValues();
  const headers = data.splice(0, 1)[0];

  const responsibleCol = headers.indexOf(
    PURCHASE_DATA.UTIL.VENDOR_DATA_COLUMNS.RESPONSIBLE
  );
  const poCol = headers.indexOf(PURCHASE_DATA.COLUMN.RO_NUMBER);
  const partNumberCol = headers.indexOf(PURCHASE_DATA.COLUMN.PART_NUMBER);

  const fupData = _defineProcurementOrLogisticResponsible(
    {data, headers},
    {responsibleCol, poCol, partNumberCol},
    keys
  );

  sheet.getRange(1, responsibleCol + 1, sheet.getLastRow()).setValues(fupData);
}

function _defineProcurementOrLogisticResponsible(
  {data, headers}: {data: string[][]; headers: string[]},
  {responsibleCol, poCol, partNumberCol}: {[col: string]: number},
  keys: string[]
) {
  const usableData = data.reduce((acc, row) => {
    if (row[responsibleCol] === RESPONSIBLE.PROCUREMENT_LOGISTIC)
      return acc.concat([[row[poCol], row[partNumberCol]]]);

    return acc;
  }, [] as [string, string][]);

  const finalData = usableData.map(row => {
    const [purchaseOrder, partNumber] = row;
    const key = `${purchaseOrder}${partNumber}`;

    return keys.includes(key)
      ? row.concat(RESPONSIBLE.PROCUREMENT)
      : row.concat(RESPONSIBLE.LOGISTIC);
  });

  const fupData = data.map(row => {
    const updatedRow = finalData.find(([po]) => po === row[poCol]);
    if (!updatedRow) return [row[responsibleCol]];

    const [, , responsible] = updatedRow;
    return [responsible];
  });

  console.log(updatingResponsible(finalData.length));
  fupData.unshift([headers[responsibleCol]]);

  return fupData;
}

function _updatePurchases(purchaseOrders: PurchaseOrder[]) {
  const {
    expectedSheet,
    utils: {headerNumber: headers},
  } = _getFupInitialData(DATA_ORIGIN.PURCHASE);

  console.log(retrievingData(true));
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

  console.log(updating());
  return purchaseOrders.map(updateSheet);
}

function _updateRepairs(purchaseOrders: PurchaseOrder[]) {
  const spreadsheet = SpreadsheetApp.openById(REPAIR_DATA.ID);
  const sheet = spreadsheet.getSheetByName(REPAIR_DATA.SHEET.ACTUAL);

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
          case REPAIR_DATA.COLUMN.RO_NUMBER:
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

  console.log(retrievingData(false));
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

  console.log(updating());
  return purchaseOrders.map(updateSheet);
}

export {
  _utilitiesToUpdateFupData,
  _utilitiesToSendPurchaseOrders,
  _defineResponsible,
  _updatePurchases,
  _updateRepairs,
};
