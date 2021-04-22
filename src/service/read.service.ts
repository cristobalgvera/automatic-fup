import {REPAIR_DATA, DB, TEMPLATE, PURCHASE_DATA, COMMON} from '../config';
import {HeaderNumber} from '../util/interface/header-number.interface';
import {
  VendorContact,
  VendorsContact,
} from '../util/interface/vendor-contact.interface';
import {GroupedVendors} from '../util/interface/grouped-vendors.interface';
import {ColumnNumbers} from '../util/interface/column-numbers.interface';
import {toCamelCase} from './utility.service';
import {ByEmailSpreadsheets} from '../util/interface/by-email-spreadsheets.interface';
import {purchaseOrderService} from './db/purchase-order.service';
import {
  _getFupInitialData,
  _getVendorsNamesByDataOrigin,
  _getToContactVendors,
  _utilitiesToExtractFupData,
  _getUtilitiesToEvaluateEmails,
  _alertVendorsToFilter,
} from '../util/service/read.utility';
import {DATA_ORIGIN} from '../util/enum/data-origin.enum';
import {totalVendors} from './message.service';

type Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;

function extractRepairDataByVendorName(
  automatic?: boolean,
  filters = REPAIR_DATA.UTIL.FILTERS
) {
  const {
    expectedSheet,
    utils: {filterColumnNumbers, sortColumnNumber, headerNumber: headers},
  } = _getFupInitialData(DATA_ORIGIN.REPAIR);
  const {groupedVendors, vendorsContact} = _getVendorsNamesByDataOrigin(
    DATA_ORIGIN.REPAIR
  );

  // Filter vendors checked as 'to send email', get his
  // contact data and set useful format to work with them
  const toContactVendors = _getToContactVendors(vendorsContact, groupedVendors);
  const toFilterVendors = Object.values(toContactVendors);

  if (
    !automatic &&
    _alertVendorsToFilter(groupedVendors, toContactVendors, toFilterVendors)
  )
    return {};

  const {
    filters: {
      byHitoRadar,
      bySendEmail,
      byValidEmail,
      byResponsible,
      byValidZone,
    },
    reducers: {onVendorId, onHasDataVendors},
  } = _utilitiesToExtractFupData(
    toFilterVendors,
    groupedVendors,
    filterColumnNumbers,
    sortColumnNumber,
    filters,
    headers,
    false
  );

  // Filter all vendors to get just the ones that are needed
  const rawVendors: GroupedVendors = expectedSheet
    .getDataRange()
    .getValues()
    .filter(byValidZone)
    .filter(byResponsible)
    .filter(byHitoRadar)
    .filter(byValidEmail)
    .filter(bySendEmail)
    .reduce(onVendorId, {});

  const vendors: GroupedVendors = Object.keys(rawVendors).reduce(
    onHasDataVendors(rawVendors),
    {}
  );

  console.log(totalVendors(Object.keys(vendors).length));

  return {vendors, headers, vendorsContact: toFilterVendors};
}

function extractPurchaseDataByVendorName(
  automatic?: boolean,
  filters = PURCHASE_DATA.UTIL.FILTERS
) {
  const {
    expectedSheet,
    utils: {filterColumnNumbers, sortColumnNumber, headerNumber: headers},
  } = _getFupInitialData(DATA_ORIGIN.PURCHASE);
  const {groupedVendors, vendorsContact} = _getVendorsNamesByDataOrigin(
    DATA_ORIGIN.PURCHASE
  );

  const toContactVendors = _getToContactVendors(vendorsContact, groupedVendors);
  const toFilterVendors = Object.values(toContactVendors);

  if (
    !automatic &&
    _alertVendorsToFilter(groupedVendors, toContactVendors, toFilterVendors)
  )
    return {};

  const {
    filters: {
      byResponsible,
      byAck,
      byFupStatusActual,
      bySendEmail,
      byValidEmail,
    },
    reducers: {onVendorId, onHasDataVendors},
  } = _utilitiesToExtractFupData(
    toFilterVendors,
    groupedVendors,
    filterColumnNumbers,
    sortColumnNumber,
    filters,
    headers,
    true
  );

  const rawVendors: GroupedVendors = expectedSheet
    .getDataRange()
    .getValues()
    .filter(byResponsible)
    .filter(byAck)
    .filter(byFupStatusActual)
    .filter(byValidEmail)
    .filter(bySendEmail)
    .reduce(onVendorId, {});

  const vendors: GroupedVendors = Object.keys(rawVendors).reduce(
    onHasDataVendors(rawVendors),
    {}
  );

  console.log(totalVendors(Object.keys(vendors).length));

  return {vendors, headers, vendorsContact: toFilterVendors};
}

function getColumnNumbers(
  templateSpreadsheet: Spreadsheet,
  headers: HeaderNumber,
  isPurchase = true
): ColumnNumbers {
  const sheet = templateSpreadsheet.getSheetByName(TEMPLATE.SHEET.OPEN_ORDERS);
  const templateHeaders = sheet
    .getRange(2, 1, 1, sheet.getLastColumn())
    .getValues()[0];

  return {
    templatePurchaseOrderColumn:
      templateHeaders.indexOf(TEMPLATE.COLUMN.PURCHASE_ORDER) + 1,
    templatePartNumberColumn:
      templateHeaders.indexOf(TEMPLATE.COLUMN.PART_NUMBER) + 1,
    templateLineColumn: templateHeaders.indexOf(TEMPLATE.COLUMN.LINE) + 1,
    templateQtdPendenteColumn:
      templateHeaders.indexOf(TEMPLATE.COLUMN.QTY_PENDING) + 1,
    roNumberColumn: isPurchase
      ? headers[PURCHASE_DATA.COLUMN.RO_NUMBER]
      : headers[REPAIR_DATA.COLUMN.RO_NUMBER],
    partNumberColumn: isPurchase
      ? headers[PURCHASE_DATA.COLUMN.PART_NUMBER]
      : headers[REPAIR_DATA.COLUMN.PART_NUMBER],
    lineColumn: isPurchase ? headers[PURCHASE_DATA.COLUMN.LINE] : undefined,
    qtdPendenteColumn: isPurchase
      ? headers[PURCHASE_DATA.COLUMN.QTD_PENDENTE]
      : undefined,
  };
}

function getVendorsContact(
  db: Spreadsheet,
  dataOrigin?: DATA_ORIGIN
): VendorsContact {
  const vendorsDataValues: string[][] = db
    .getSheetByName(COMMON.DEV_MODE() ? DB.SHEET.DEV : DB.SHEET.VENDOR)
    .getDataRange()
    .getValues();

  const headers = vendorsDataValues.splice(0, 1)[0].map(toCamelCase);

  const emptyHeaderCol = headers.indexOf('');
  if (emptyHeaderCol !== -1) headers.splice(emptyHeaderCol);

  const idColumn = headers.indexOf(toCamelCase(DB.COLUMN.ID));
  const typeColumn = headers.indexOf(toCamelCase(DB.COLUMN.VENDOR_TYPE));

  const byCorrectDataOrigin = (vendor: string[]) =>
    !dataOrigin || vendor[typeColumn] === dataOrigin;

  return vendorsDataValues.filter(byCorrectDataOrigin).reduce((acc, vendor) => {
    const vendorId = vendor[idColumn];
    if (!acc[vendorId])
      acc[vendorId] = headers.reduce((obj, header, index) => {
        obj[header] = vendor[index];
        return obj;
      }, {} as VendorContact);

    return acc;
  }, {} as VendorsContact);
}

function evaluateByEmailSpreadsheets(
  byEmailSpreadsheets: ByEmailSpreadsheets,
  createMailRecordActions: (() => void)[]
) {
  const db = SpreadsheetApp.openById(DB.ID);
  const data = Object.entries(byEmailSpreadsheets);
  const vendorsContact = getVendorsContact(db);
  const contacts = Object.entries(vendorsContact);
  const [purchasesContacts, repairsContacts]: [
    [string, VendorContact][],
    [string, VendorContact][]
  ] = contacts.reduce(
    (acc, [id, contact]) => {
      const type = contact.type;
      const purchases: [string, VendorContact][] = acc[0];
      const repairs: [string, VendorContact][] = acc[1];
      const row: [string, VendorContact] = [id, contact];
      if (type === DATA_ORIGIN.PURCHASE) purchases.push(row);
      else repairs.push(row);

      return [purchases, repairs];
    },
    [[], []]
  );

  const templateHeaders = Object.entries(TEMPLATE.UTIL.COLUMN_NAME);

  const {toPurchaseOrders} = _getUtilitiesToEvaluateEmails();

  const purchaseOrders = data.reduce(
    toPurchaseOrders(purchasesContacts, repairsContacts, templateHeaders),
    []
  );

  const filtered = purchaseOrders.filter(
    ({purchaseOrder, partNumber}) => !!purchaseOrder && !!partNumber
  );

  purchaseOrderService.saveAll(filtered);
  createMailRecordActions.forEach(create => create());
}

export {
  extractRepairDataByVendorName,
  extractPurchaseDataByVendorName,
  getColumnNumbers,
  getVendorsContact,
  evaluateByEmailSpreadsheets,
};
