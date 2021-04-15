import {COMMON, PURCHASES_DATA, DB, TEMPLATE, UI} from '../config';
import {HeaderNumber} from '../util/interface/header-number.interface';
import {
  VendorContact,
  VendorsContact,
} from '../util/interface/vendor-contact.interface';
import {GroupedVendors} from '../util/interface/grouped-vendors.interface';
import {ColumnNumbers} from '../util/interface/column-numbers.interface';
import {
  addSuffix,
  toCamelCase,
  userConfirmation,
  validateEmail,
} from './utility.service';
import {REPAIRS_DATA} from '../config/repairs-data.config';
import Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;
import {ByEmailSpreadsheets} from '../util/interface/by-email-spreadsheets.interface';
import {purchaseOrderService} from './purchase-order.service';
import {
  _getPurchasesInitialData,
  _getVendorsNames,
  _getToContactVendors,
  _utilitiesToExtractFupData,
  _getUtilitiesToEvaluateEmails,
} from '../util/service/read.utility';

function extractFupDataGroupedByVendorName(
  automatic = false,
  filters: string[] = COMMON.DEFAULT.FILTERS
) {
  const {
    expectedSheet,
    utils: {filterColumnNumber, sortColumnNumber, headerNumber: headers},
  } = _getPurchasesInitialData();
  const {groupedVendors, vendorsContact} = _getVendorsNames();

  // Filter vendors checked as 'to send email', get his
  // contact data and set useful format to work with them
  const toContactVendors = _getToContactVendors(vendorsContact);
  const toFilterVendors = Object.values(toContactVendors).map(vendor => vendor);

  // Create a list-like string to show in a pop-up
  const toFilterVendorNames = toFilterVendors.reduce(
    (acc: string[], {id, name}) =>
      groupedVendors[id]
        ? validateEmail(toContactVendors[id].email)
          ? acc.concat(name)
          : acc.concat(addSuffix(name, UI.MODAL.SUFFIX.NO_EMAIL))
        : acc.concat(addSuffix(name, UI.MODAL.SUFFIX.NO_LINKED_VENDOR_NAMES)),
    []
  );

  // Confirm vendors to filter with user
  if (!automatic)
    if (!userConfirmation(UI.MODAL.TO_SEARCH_VENDORS, toFilterVendorNames))
      return {};

  const {
    filters: {byHitoRadar, bySendEmail, byValidEmail},
    reducers: {onVendorId},
  } = _utilitiesToExtractFupData(
    toFilterVendors,
    groupedVendors,
    filterColumnNumber,
    sortColumnNumber,
    filters
  );

  // Filter all vendors to get just the ones that are needed
  const vendors: GroupedVendors = expectedSheet
    .getDataRange()
    .getValues()
    .filter(byHitoRadar)
    .filter(byValidEmail)
    .filter(bySendEmail)
    .reduce(onVendorId, {});

  // Put in an array all vendors that has no data
  const withProblemsVendorNames = toFilterVendors.reduce(
    (acc: string[], {id, name}) =>
      vendors[id]
        ? acc
        : validateEmail(toContactVendors[id].email)
        ? acc.concat(addSuffix(name, UI.MODAL.SUFFIX.NO_PURCHASE_ORDERS))
        : acc.concat(addSuffix(name, UI.MODAL.SUFFIX.NO_EMAIL)),
    []
  );

  // If some vendor has no data, ask user for confirmation, else continue
  if (!automatic && withProblemsVendorNames.length)
    if (!userConfirmation(UI.MODAL.NO_DATA_VENDORS, withProblemsVendorNames))
      return {};

  return {vendors, headers, vendorsContact: toFilterVendors};
}

function getColumnNumbers(
  templateSpreadsheet: Spreadsheet,
  headers: HeaderNumber
): ColumnNumbers {
  const sheet = templateSpreadsheet.getSheetByName(TEMPLATE.SHEET.PURCHASE);
  const templateHeaders = sheet
    .getRange(2, 1, 1, sheet.getLastColumn())
    .getValues()[0];

  return {
    templatePurchaseOrderColumn:
      templateHeaders.indexOf(TEMPLATE.COLUMN.PURCHASE_ORDER) + 1,
    templatePartNumberColumn:
      templateHeaders.indexOf(TEMPLATE.COLUMN.PART_NUMBER) + 1,
    templateLineColumn: templateHeaders.indexOf(TEMPLATE.COLUMN.LINE) + 1,
    roNumberColumn: headers[PURCHASES_DATA.COLUMN.RO_NUMBER],
    partNumberColumn: headers[PURCHASES_DATA.COLUMN.PART_NUMBER],
    lineColumn: headers[PURCHASES_DATA.COLUMN.LINE],
  };
}

function getVendorsContact(db: Spreadsheet): VendorsContact {
  const vendorsDataDataRange: string[][] = db
    .getSheetByName(DB.SHEET.VENDOR)
    .getDataRange()
    .getValues();
  const headers = vendorsDataDataRange.splice(0, 1)[0].map(toCamelCase);
  const idColumn = headers.indexOf(toCamelCase(DB.COLUMN.ID));

  return vendorsDataDataRange.reduce((acc, vendor) => {
    const vendorId = vendor[idColumn];
    if (!acc[vendorId]) {
      acc[vendorId] = headers.reduce((obj, header, index) => {
        obj[header] = vendor[index];
        return obj;
      }, {} as VendorContact);
    }

    return acc;
  }, {} as VendorsContact);
}

function evaluateByEmailSpreadsheets(byEmailSpreadsheets: ByEmailSpreadsheets) {
  const db = SpreadsheetApp.openById(DB.ID);
  const data = Object.entries(byEmailSpreadsheets);
  const vendorsContact = getVendorsContact(db);
  const contacts = Object.entries(vendorsContact);
  const templateHeaders = Object.entries(TEMPLATE.UTIL.COLUMN_NAMES);

  const {toPurchaseOrders} = _getUtilitiesToEvaluateEmails();

  const purchaseOrders = data.reduce(
    toPurchaseOrders(contacts, templateHeaders),
    []
  );

  purchaseOrderService.saveAll(purchaseOrders);
}

function getRepairsInitialData() {
  const spreadsheet = SpreadsheetApp.openById(REPAIRS_DATA.ID);
  // To set dictionary
  const expectedSheet = spreadsheet.getSheetByName(
    REPAIRS_DATA.SHEET.DICTIONARY
  );

  const totalColumns = expectedSheet.getLastColumn();

  const headers: string[] = expectedSheet
    .getRange(1, 1, 1, totalColumns)
    .getValues()[0];
  const headerNumber: HeaderNumber = headers.reduce(
    (acc, header, index) => ({
      ...acc,
      [header]: index,
    }),
    {}
  );

  const vendorNameColumnNumber = headerNumber[REPAIRS_DATA.COLUMN.VENDOR_NAME];
  const vendorResponsibleColumnNumber =
    headerNumber[REPAIRS_DATA.COLUMN.VENDOR_RESPONSIBLE];

  return {
    expectedSheet,
    vendorNameColumnNumber,
    vendorResponsibleColumnNumber,
    headerNumber,
  };
}

export {
  extractFupDataGroupedByVendorName,
  getColumnNumbers,
  getRepairsInitialData,
  getVendorsContact,
  evaluateByEmailSpreadsheets,
};
