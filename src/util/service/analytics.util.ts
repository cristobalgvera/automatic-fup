import {ANALYTICS} from '../../config';
import {DATA_ORIGIN} from '../enum/data-origin.enum';
import {HeaderNumber} from '../interface/header-number.interface';
import {AnalyticsRaw} from '../schema/dto/analytics-raw.dto';
import {PurchaseOrder} from '../schema/purchase-order.schema';

function _utilitiesToStoreData() {
  const spreadsheet = SpreadsheetApp.openById(ANALYTICS.ID);
  const sheet = spreadsheet.getSheetByName(ANALYTICS.SHEET.RAW_FIREBASE);

  const headers: string[] = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0];
  const headersNames = Object.values(ANALYTICS.COLUMN.FIREBASE);

  const headersNumber = headersNames.reduce((acc: HeaderNumber, headerName) => {
    const headerNumber = headers.indexOf(headerName);

    if (headerNumber === -1) return acc;

    return {...acc, [headerName]: headerNumber};
  }, {});

  const createRow = (analyticsRaw: AnalyticsRaw) => {
    const row = [];
    for (const header in headersNumber)
      if (Object.prototype.hasOwnProperty.call(headersNumber, header)) {
        const column = headersNumber[header];

        row[column] = analyticsRaw[header];
      }

    return [...row];
  };

  const setRequiredFormat = ({
    id,
    purchaseOrder,
    line,
    partNumber,
    qtyPending,
    status,
    esd,
    shippedDate,
    qtyShipped,
    awb,
    vendorName,
    comments,
    audit: {conflictive, isPurchase, creationDate, vendorEmail, updateDate},
  }: PurchaseOrder): AnalyticsRaw => {
    return {
      id,
      purchaseOrder,
      line,
      partNumber,
      qtyPending,
      status,
      esd,
      shippedDate,
      qtyShipped,
      awb,
      vendorName,
      comments,
      conflictive,
      creationDate,
      updateDate,
      vendorEmail,
      dataOrigin: isPurchase ? DATA_ORIGIN.PURCHASE : DATA_ORIGIN.REPAIR,
    };
  };

  return {sheet, headersNumber, actions: {createRow, setRequiredFormat}};
}

export {_utilitiesToStoreData};
