function extractFupDataGroupedByVendorName(filterText = COMMON.DEFAULT.FILTER_TEXT) {
  const { expectedSheet, filterColumnNumber, sortColumnNumber, headersObject: headers } = _getInitialData();
  const { groupedVendors, vendorsData } = _getVendorsNames();

  const sendEmailVendors = _getSendEmailVendors(vendorsData);
  const toFilterVendors = Object.values(sendEmailVendors).map(vendor => vendor);

  const toFilterVendorNames = toFilterVendors.reduce((acc, { id, name }) =>
    !!groupedVendors[id] ? acc.concat(name) : acc.concat(`${name} ${UI.MODAL.SUFFIX.NO_LINKED_VENDOR_NAMES}`), []);

  if (!userConfirmation(UI.MODAL.TO_SEARCH_VENDORS, toFilterVendorNames))
    return {};

  const { byHitoRadar, bySendEmail, byVendorId } = _utilitiesToExtractFupData(
    toFilterVendors,
    groupedVendors,
    filterColumnNumber,
    sortColumnNumber,
    filterText
  );

  const vendors = expectedSheet.getDataRange()
    .getValues()
    .filter(byHitoRadar)
    .filter(bySendEmail)
    .reduce(byVendorId, {});

  const noDataVendorNames = toFilterVendors.reduce((acc, { id, name }) =>
    !vendors[id] ? acc.concat(`${name} ${UI.MODAL.SUFFIX.NO_PURCHASE_ORDERS}`) : acc, []);

  if (noDataVendorNames.length && !userConfirmation(UI.MODAL.NO_DATA_VENDORS, noDataVendorNames))
    return {};

  return { vendors, headers, vendorsContact: toFilterVendors };
}

function getColumnNumbers(templateFile, headers) {
  const templateSheet = SpreadsheetApp.open(templateFile)
    .getSheetByName(TEMPLATE.SHEET.PURCHASE);
  const templateHeaders = templateSheet
    .getRange(2, 1, 1, templateSheet.getLastColumn())
    .getValues()[0];

  const templatePurchaseOrderColumn = templateHeaders.indexOf(TEMPLATE.COLUMN.PURCHASE_ORDER) + 1;
  const templatePartNumberColumn = templateHeaders.indexOf(TEMPLATE.COLUMN.PART_NUMBER) + 1;
  const templateLineColumn = templateHeaders.indexOf(TEMPLATE.COLUMN.LINE) + 1;
  const roNumberColumn = headers[DATA.COLUMN.RO_NUMBER];
  const partNumberColumn = headers[DATA.COLUMN.PART_NUMBER];
  const lineColumn = headers[DATA.COLUMN.LINE];

  return {
    templatePurchaseOrderColumn,
    templatePartNumberColumn,
    templateLineColumn,
    roNumberColumn,
    partNumberColumn,
    lineColumn,
  };
}

function _utilitiesToExtractFupData(toFilterVendors, groupedVendors, filterColumnNumber, sortColumnNumber, filterText) {
  const toFilterGroupedVendors = Object.entries(toFilterVendors
    .reduce((acc, { id }) => ({ ...acc, [id]: groupedVendors[id] }), {}));

  const shouldSendEmailToVendor = (searchedName) =>
    !!toFilterVendors.find(vendor => groupedVendors[vendor.id]
      ? groupedVendors[vendor.id].find(name => name === searchedName)
      : false);

  const getVendorId = (vendorName) => toFilterGroupedVendors.find(vendor => {
    const [_, vendorNames] = vendor;

    return vendorNames
      ? !!vendorNames.find(name => name === vendorName)
      : false;
  })[0];

  const byHitoRadar = row => row[filterColumnNumber] === filterText;
  const bySendEmail = row => toFilterVendors.length
    ? shouldSendEmailToVendor(row[sortColumnNumber])
    : false;
  const byVendorId = (acc, row) => {
    const vendorId = getVendorId(row[sortColumnNumber]);

    if (!(vendorId in acc))
      acc[vendorId] = []

    acc[vendorId].push(row);
    return acc;
  };

  return { byHitoRadar, bySendEmail, byVendorId };
}

function _getSendEmailVendors(vendorsData) {
  return Object.entries(vendorsData).reduce((acc, vendor) => {
    const [vendorId, vendorData] = vendor;
    if (vendorData.sendEmail)
      acc[vendorId] = vendorData;

    return acc;
  }, {});
}

function _getVendorsNames() {
  const db = SpreadsheetApp.openById(DB.ID);

  const groupedVendors = _getGroupedVendors(db);
  const vendorsData = _getVendorsData(db);

  return { groupedVendors, vendorsData };
}

function _getGroupedVendors(db) {
  const groupedVendorsDataRange = db.getSheetByName(DB.SHEET.LINKED_VENDOR_NAME)
    .getDataRange()
    .getValues();
  const headers = groupedVendorsDataRange.splice(0, 1)[0];

  const vendorIdColumn = headers.indexOf(DB.COLUMN.VENDOR_ID);
  const vendorNameColumn = headers.indexOf(DB.COLUMN.VENDOR_NAME);

  return groupedVendorsDataRange.reduce((acc, vendor) => {
    const vendorId = vendor[vendorIdColumn];
    const vendorName = vendor[vendorNameColumn];

    if (!acc[vendorId])
      acc[vendorId] = [];

    acc[vendorId].push(vendorName);
    return acc;
  }, {});
}

function _getVendorsData(db) {
  const vendorsDataDataRange = db.getSheetByName(DB.SHEET.VENDOR)
    .getDataRange()
    .getValues();
  const headers = vendorsDataDataRange.splice(0, 1)[0].map(toCamelCase);
  const idColumn = headers.indexOf(toCamelCase(DB.COLUMN.ID));

  return vendorsDataDataRange.reduce((acc, vendor) => {
    vendorId = vendor[idColumn];
    if (!acc[vendorId])
      acc[vendorId] = headers.reduce((obj, header, index) => {
        obj[header] = vendor[index];
        return obj;
      }, {});

    return acc;
  }, {});
}

function _getInitialData() {
  const spreadsheet = SpreadsheetApp.openById(DATA.ID);
  const expectedSheet = spreadsheet.getSheetByName(DATA.SHEET.ACTUAL);

  if (expectedSheet.getFilter())
    expectedSheet.getFilter().remove();

  const totalColumns = expectedSheet.getLastColumn();

  const headers = expectedSheet.getRange(1, 1, 1, totalColumns).getValues()[0];
  const headersObject = headers.reduce((acc, header, index) => ({ ...acc, [header]: index }), {});

  const filterColumnNumber = headersObject[DATA.UTIL.FILTER_COLUMN];
  const sortColumnNumber = headersObject[DATA.UTIL.SORT_COLUMN];

  return { expectedSheet, filterColumnNumber, sortColumnNumber, headersObject }
}
