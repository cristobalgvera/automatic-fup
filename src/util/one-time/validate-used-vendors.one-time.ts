import {DB, PURCHASE_DATA, REPAIR_DATA} from '../../config';

export function validateUsedVendors(
  isPurchase: boolean,
  byCode?: boolean,
  colToPut?: number
) {
  const dbSpreadsheet = SpreadsheetApp.openById(DB.ID);
  const linkedVendorNameSheet = dbSpreadsheet.getSheetByName(
    DB.SHEET.LINKED_VENDOR_NAME
  );

  const dbVendorData: string[] = linkedVendorNameSheet
    .getRange(
      2,
      1,
      linkedVendorNameSheet.getLastRow(),
      linkedVendorNameSheet.getLastColumn()
    )
    .getValues()
    .filter(row => (row[3] === isPurchase ? 'COMPRAS' : 'REPARACIONES'))
    .map(row => row[byCode ? 2 : 1])
    .map(value => String(value).toLocaleLowerCase());

  const dataSpreadsheet = SpreadsheetApp.openById(
    isPurchase ? PURCHASE_DATA.ID : REPAIR_DATA.ID
  );
  const dataActualSheet = dataSpreadsheet.getSheetByName(
    isPurchase ? PURCHASE_DATA.SHEET.ACTUAL : REPAIR_DATA.SHEET.ACTUAL
  );

  const dataData = dataActualSheet.getDataRange().getValues();
  const headers = dataData.splice(0, 1)[0];

  const vendorCodeCol = headers.indexOf(
    isPurchase
      ? PURCHASE_DATA.COLUMN.VENDOR_CODE
      : REPAIR_DATA.COLUMN.VENDOR_CODE
  );
  const vendorNameCol = headers.indexOf(
    isPurchase
      ? PURCHASE_DATA.COLUMN.VENDOR_NAME
      : REPAIR_DATA.COLUMN.VENDOR_NAME
  );
  const hitoRadarCol = headers.indexOf(
    REPAIR_DATA.UTIL.FILTER_COLUMNS.HITO_RADAR
  );
  const ackCol = headers.indexOf(PURCHASE_DATA.UTIL.FILTER_COLUMNS.ACK);
  const fupStatusActualCol = headers.indexOf(
    PURCHASE_DATA.UTIL.FILTER_COLUMNS.FUP_STATUS_ACTUAL
  );

  let dataVendorData: string[];

  if (isPurchase) {
    dataVendorData = dataData
      .filter(data => PURCHASE_DATA.UTIL.FILTERS.ACK.includes(data[ackCol]))
      .filter(data =>
        PURCHASE_DATA.UTIL.FILTERS.FUP_STATUS_ACTUAL.includes(
          data[fupStatusActualCol]
        )
      )
      .map(data => data[byCode ? vendorCodeCol : vendorNameCol]);
  } else {
    dataVendorData = dataData
      .filter(data =>
        REPAIR_DATA.UTIL.FILTERS.HITO_RADAR.includes(data[hitoRadarCol])
      )
      .map(data => data[byCode ? vendorCodeCol : vendorNameCol]);
  }

  const unusedVendorData = dataVendorData.filter(
    data => !dbVendorData.includes(data.toLocaleLowerCase())
  );

  const uniqueUnusedData = Array.from(new Set(unusedVendorData), data => [
    data,
  ]);

  const spreadsheet = SpreadsheetApp.openById(
    '1iWRK1BV2on5bGOmejjmKHqfCsQ7DDEeTE1AXBTRLg3E'
  );
  const sheet = spreadsheet.getSheetByName('OTROS');

  const col = colToPut ?? (isPurchase ? 1 : 2);

  sheet.getRange(2, col, uniqueUnusedData.length).setValues(uniqueUnusedData);
}
