import { COMMON, DATA, DB, TEMPLATE, UI } from '../../config';
import { HeaderNumber } from '../util/interfaces/header-number';
import { VendorContact, VendorsContact } from '../util/interfaces/vendor-contact';
import { GroupedVendors } from '../util/interfaces/grouped-vendors';
import { ColumnNumbers } from '../util/interfaces/column-numbers';
import { toCamelCase, userConfirmation } from './utility.service';
import Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;

function extractFupDataGroupedByVendorName( filters: string[] = COMMON.DEFAULT.FILTERS ) {
    const { expectedSheet, filterColumnNumber, sortColumnNumber, headerNumber: headers } = _getInitialData();
    const { groupedVendors, vendorsContact } = _getVendorsNames();

    // Filter vendors checked as 'to send email', get his
    // contact data and set useful format to work with them
    const toContactVendors = _getToContactVendors(vendorsContact);
    const toFilterVendors = Object.values(toContactVendors).map(vendor => vendor);

    // Create a list-like string to show in a pop-up
    const toFilterVendorNames = toFilterVendors.reduce(( acc: string[], { id, name } ) =>
            !!groupedVendors[id]
                ? acc.concat(name)
                // Alert for each vendor that has not linked vendor names in DB
                : acc.concat(`${name} ${UI.MODAL.SUFFIX.NO_LINKED_VENDOR_NAMES}`)
        , []);

    // Confirm vendors to filter with user
    if (!userConfirmation(UI.MODAL.TO_SEARCH_VENDORS, toFilterVendorNames))
        return {};

    const { byHitoRadar, bySendEmail, byVendorId } = _utilitiesToExtractFupData(
        toFilterVendors,
        groupedVendors,
        filterColumnNumber,
        sortColumnNumber,
        filters,
    );

    // Filter all vendors to get just the ones that are needed
    const vendors: GroupedVendors = expectedSheet.getDataRange()
        .getValues()
        .filter(byHitoRadar)
        .filter(bySendEmail)
        .reduce(byVendorId, {});

    // Put in an array all vendors that has no data
    const noDataVendorNames = toFilterVendors.reduce(( acc: string[], { id, name } ) =>
            !!vendors[id]
                ? acc
                : acc.concat(`${name} ${UI.MODAL.SUFFIX.NO_PURCHASE_ORDERS}`)
        , []);

    // If some vendor has no data, ask user for confirmation, else continue
    return noDataVendorNames.length && !userConfirmation(UI.MODAL.NO_DATA_VENDORS, noDataVendorNames)
        ? {}
        : { vendors, headers, vendorsContact: toFilterVendors };
}

function getColumnNumbers( templateSpreadsheet: Spreadsheet, headers: HeaderNumber ): ColumnNumbers {
    const sheet = templateSpreadsheet.getSheetByName(TEMPLATE.SHEET.PURCHASE);
    const templateHeaders = sheet.getRange(2, 1, 1, sheet.getLastColumn())
        .getValues()[0];

    return {
        templatePurchaseOrderColumn: templateHeaders.indexOf(TEMPLATE.COLUMN.PURCHASE_ORDER) + 1,
        templatePartNumberColumn: templateHeaders.indexOf(TEMPLATE.COLUMN.PART_NUMBER) + 1,
        templateLineColumn: templateHeaders.indexOf(TEMPLATE.COLUMN.LINE) + 1,
        roNumberColumn: headers[DATA.COLUMN.RO_NUMBER],
        partNumberColumn: headers[DATA.COLUMN.PART_NUMBER],
        lineColumn: headers[DATA.COLUMN.LINE],
    };
}

function _utilitiesToExtractFupData(
    toFilterVendors: VendorContact[],
    groupedVendors: GroupedVendors,
    filterColumnNumber: number,
    sortColumnNumber: number,
    filters: string[],
) {
    const toFilterGroupedVendors = Object.entries(toFilterVendors.reduce(( acc: GroupedVendors, { id } ) => ({
        ...acc,
        [id]: groupedVendors[id],
    }), {}));

    const shouldSendEmailToVendor = ( searchedName: string ) =>
        !!toFilterVendors.find(vendor => groupedVendors[vendor.id]?.find(name => name === searchedName) ?? false);

    const getVendorId = ( vendorName: string ) => toFilterGroupedVendors
        .find(vendor => vendor[1]?.some(name => name === vendorName) ?? false)[0];

    const byHitoRadar = ( row: string[] ) => filters.includes(row[filterColumnNumber]);
    const bySendEmail = ( row: string[] ) => toFilterVendors.length
        ? shouldSendEmailToVendor(row[sortColumnNumber])
        : false;
    const byVendorId = ( acc, row: string[] ) => {
        const vendorId = getVendorId(row[sortColumnNumber]);

        acc[vendorId] ??= [];
        acc[vendorId].push(row);
        return acc;
    };

    return { byHitoRadar, bySendEmail, byVendorId };
}

function _getToContactVendors( vendorsContact: VendorsContact ) {
    return Object.entries(vendorsContact).reduce(( acc, vendorContact ) => {
        const [vendorId, contact] = vendorContact;
        if (contact.sendEmail)
            acc[vendorId] = contact;

        return acc;
    }, {} as VendorsContact);
}

function _getVendorsNames() {
    const db = SpreadsheetApp.openById(DB.ID);

    const groupedVendors = _getGroupedVendors(db);
    const vendorsContact = _getVendorsContact(db);

    return { groupedVendors, vendorsContact };
}

function _getGroupedVendors( db: Spreadsheet ) {
    const groupedVendorsDataRange: string[][] = db.getSheetByName(DB.SHEET.LINKED_VENDOR_NAME)
        .getDataRange()
        .getValues();
    const headers = groupedVendorsDataRange.splice(0, 1)[0];

    const vendorIdColumn = headers.indexOf(DB.COLUMN.VENDOR_ID);
    const vendorNameColumn = headers.indexOf(DB.COLUMN.VENDOR_NAME);

    return groupedVendorsDataRange.reduce(( acc: GroupedVendors, vendor ) => {
        const vendorId = vendor[vendorIdColumn];
        const vendorName = vendor[vendorNameColumn];

        if (!acc[vendorId])
            acc[vendorId] = [];

        acc[vendorId].push(vendorName);
        return acc;
    }, {});
}

function _getVendorsContact( db: Spreadsheet ) {
    const vendorsDataDataRange: string[][] = db.getSheetByName(DB.SHEET.VENDOR)
        .getDataRange()
        .getValues();
    const headers = vendorsDataDataRange.splice(0, 1)[0].map(toCamelCase);
    const idColumn = headers.indexOf(toCamelCase(DB.COLUMN.ID));

    return vendorsDataDataRange.reduce(( acc, vendor ) => {
        const vendorId = vendor[idColumn];
        if (!acc[vendorId])
            acc[vendorId] = headers.reduce(( obj, header, index ) => {
                obj[header] = vendor[index];
                return obj;
            }, {} as VendorContact);

        return acc;
    }, {} as VendorsContact);
}

function _getInitialData() {
    const spreadsheet = SpreadsheetApp.openById(DATA.ID);
    const expectedSheet = spreadsheet.getSheetByName(DATA.SHEET.ACTUAL);

    if (expectedSheet.getFilter())
        expectedSheet.getFilter().remove();

    const totalColumns = expectedSheet.getLastColumn();

    const headers: string[] = expectedSheet.getRange(1, 1, 1, totalColumns).getValues()[0];
    const headerNumber: HeaderNumber = headers.reduce(( acc, header, index ) => ({
        ...acc,
        [header]: index,
    }), {});

    const filterColumnNumber = headerNumber[DATA.UTIL.FILTER_COLUMNS];
    const sortColumnNumber = headerNumber[DATA.UTIL.SORT_COLUMN];

    return { expectedSheet, filterColumnNumber, sortColumnNumber, headerNumber };
}

export {
    extractFupDataGroupedByVendorName,
    getColumnNumbers,
};
