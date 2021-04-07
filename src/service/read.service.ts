import { COMMON, PURCHASES_DATA, DB, TEMPLATE, UI } from '../../config';
import { HeaderNumber } from '../util/interface/header-number.interface';
import {
  VendorContact,
  VendorsContact,
} from '../util/interface/vendor-contact.interface';
import { GroupedVendors } from '../util/interface/grouped-vendors.interface';
import { ColumnNumbers } from '../util/interface/column-numbers.interface';
import {
  addSuffix,
  toCamelCase,
  userConfirmation,
  validateEmail,
} from './utility.service';
import Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;
import { REPAIRS_DATA } from '../../config/repairs-data.config';

function extractFupDataGroupedByVendorName(
  filters: string[] = COMMON.DEFAULT.FILTERS,
) {
  const {
    expectedSheet,
    filterColumnNumber,
    sortColumnNumber,
    headerNumber: headers,
  } = _getPurchasesInitialData();
  const { groupedVendors, vendorsContact } = _getVendorsNames();

  // Filter vendors checked as 'to send email', get his
  // contact data and set useful format to work with them
  const toContactVendors = _getToContactVendors(vendorsContact);
  const toFilterVendors = Object.values(toContactVendors).map(
    (vendor) => vendor,
  );

  // Create a list-like string to show in a pop-up
  const toFilterVendorNames = toFilterVendors.reduce(
    (acc: string[], { id, name }) =>
      !!groupedVendors[id]
        ? validateEmail(toContactVendors[id].email)
          ? acc.concat(name)
          : acc.concat(addSuffix(name, UI.MODAL.SUFFIX.NO_EMAIL))
        : acc.concat(addSuffix(name, UI.MODAL.SUFFIX.NO_LINKED_VENDOR_NAMES)),
    [],
  );

  // Confirm vendors to filter with user
  if (!userConfirmation(UI.MODAL.TO_SEARCH_VENDORS, toFilterVendorNames))
    return {};

  const {
    byHitoRadar,
    bySendEmail,
    byVendorId,
    byValidEmail,
  } = _utilitiesToExtractFupData(
    toFilterVendors,
    groupedVendors,
    filterColumnNumber,
    sortColumnNumber,
    filters,
  );

  // Filter all vendors to get just the ones that are needed
  const vendors: GroupedVendors = expectedSheet
    .getDataRange()
    .getValues()
    .filter(byHitoRadar)
    .filter(byValidEmail)
    .filter(bySendEmail)
    .reduce(byVendorId, {});

  // Put in an array all vendors that has no data
  const withProblemsVendorNames = toFilterVendors.reduce(
    (acc: string[], { id, name }) =>
      !!vendors[id]
        ? acc
        : !!validateEmail(toContactVendors[id].email)
        ? acc.concat(addSuffix(name, UI.MODAL.SUFFIX.NO_PURCHASE_ORDERS))
        : acc.concat(addSuffix(name, UI.MODAL.SUFFIX.NO_EMAIL)),
    [],
  );

  // If some vendor has no data, ask user for confirmation, else continue
  return withProblemsVendorNames.length &&
    !userConfirmation(UI.MODAL.NO_DATA_VENDORS, withProblemsVendorNames)
    ? {}
    : { vendors, headers, vendorsContact: toFilterVendors };
}

function getColumnNumbers(
  templateSpreadsheet: Spreadsheet,
  headers: HeaderNumber,
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

function _utilitiesToExtractFupData(
  toFilterVendors: VendorContact[],
  groupedVendors: GroupedVendors,
  filterColumnNumber: number,
  sortColumnNumber: number,
  filters: string[],
) {
  const toFilterGroupedVendors = Object.entries(
    toFilterVendors.reduce(
      (acc: GroupedVendors, { id }) => ({
        ...acc,
        [id]: groupedVendors[id],
      }),
      {},
    ),
  );

  const shouldSendEmailToVendor = (searchedName: string) =>
    !!toFilterVendors.find(
      (vendor) =>
        groupedVendors[vendor.id]?.find((name) => name === searchedName) ??
        false,
    );

  const isValidEmail = (searchedName: string) => {
    const email = toFilterVendors.find(
      (vendor) =>
        !!groupedVendors[vendor.id]?.find((name) => name === searchedName),
    )?.email;

    return !!email ? validateEmail(email) : false;
  };

  const getVendorId = (vendorName: string) =>
    toFilterGroupedVendors.find(
      (vendor) => vendor[1]?.some((name) => name === vendorName) ?? false,
    )[0];

  const byHitoRadar = (row: string[]) =>
    filters.includes(row[filterColumnNumber]);
  const byValidEmail = (row: string[]) =>
    toFilterVendors.length ? isValidEmail(row[sortColumnNumber]) : false;
  const bySendEmail = (row: string[]) =>
    toFilterVendors.length
      ? shouldSendEmailToVendor(row[sortColumnNumber])
      : false;
  const byVendorId = (acc, row: string[]) => {
    const vendorId = getVendorId(row[sortColumnNumber]);

    acc[vendorId] ??= [];
    acc[vendorId].push(row);
    return acc;
  };

  return { byHitoRadar, bySendEmail, byVendorId, byValidEmail };
}

function _getToContactVendors(vendorsContact: VendorsContact) {
  return Object.entries(vendorsContact).reduce((acc, vendorContact) => {
    const [vendorId, contact] = vendorContact;
    if (contact.sendEmail) acc[vendorId] = contact;

    return acc;
  }, {} as VendorsContact);
}

function _getVendorsNames() {
  const db = SpreadsheetApp.openById(DB.ID);

  const groupedVendors = _getGroupedVendors(db);
  const vendorsContact = _getVendorsContact(db);

  return { groupedVendors, vendorsContact };
}

function _getGroupedVendors(db: Spreadsheet) {
  const groupedVendorsDataRange: string[][] = db
    .getSheetByName(DB.SHEET.LINKED_VENDOR_NAME)
    .getDataRange()
    .getValues();
  const headers = groupedVendorsDataRange.splice(0, 1)[0];

  const vendorIdColumn = headers.indexOf(DB.COLUMN.VENDOR_ID);
  const vendorNameColumn = headers.indexOf(DB.COLUMN.VENDOR_NAME);

  return groupedVendorsDataRange.reduce((acc: GroupedVendors, vendor) => {
    const vendorId = vendor[vendorIdColumn];
    const vendorName = vendor[vendorNameColumn];

    acc[vendorId] ??= [];
    acc[vendorId].push(vendorName);
    return acc;
  }, {});
}

function _getVendorsContact(db: Spreadsheet) {
  const vendorsDataDataRange: string[][] = db
    .getSheetByName(DB.SHEET.VENDOR)
    .getDataRange()
    .getValues();
  const headers = vendorsDataDataRange.splice(0, 1)[0].map(toCamelCase);
  const idColumn = headers.indexOf(toCamelCase(DB.COLUMN.ID));

  return vendorsDataDataRange.reduce((acc, vendor) => {
    const vendorId = vendor[idColumn];
    if (!acc[vendorId])
      acc[vendorId] = headers.reduce((obj, header, index) => {
        obj[header] = vendor[index];
        return obj;
      }, {} as VendorContact);

    return acc;
  }, {} as VendorsContact);
}

function _getPurchasesInitialData() {
  const spreadsheet = SpreadsheetApp.openById(PURCHASES_DATA.ID);
  const expectedSheet = spreadsheet.getSheetByName(PURCHASES_DATA.SHEET.ACTUAL);

  const totalColumns = expectedSheet.getLastColumn();

  const headers: string[] = expectedSheet
    .getRange(1, 1, 1, totalColumns)
    .getValues()[0];
  const headerNumber: HeaderNumber = headers.reduce(
    (acc, header, index) => ({
      ...acc,
      [header]: index,
    }),
    {},
  );

  const filterColumnNumber = headerNumber[PURCHASES_DATA.UTIL.FILTER_COLUMN];
  const sortColumnNumber = headerNumber[PURCHASES_DATA.UTIL.SORT_COLUMN];

  return { expectedSheet, filterColumnNumber, sortColumnNumber, headerNumber };
}

function getRepairsInitialData() {
  const spreadsheet = SpreadsheetApp.openById(REPAIRS_DATA.ID);
  // To set dictionary
  const expectedSheet = spreadsheet.getSheetByName(
    REPAIRS_DATA.SHEET.DICTIONARY,
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
    {},
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
};
