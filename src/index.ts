import {
  consolidateOpenOrders,
  createSheetFiles,
  getTemplateAndCreateFolderForRegistries,
} from './service/drive.service';
import {
  extractPurchaseDataByVendorName,
  extractRepairDataByVendorName,
  getColumnNumbers,
} from './service/read.service';
import {COMMON, DB, UI} from './config';
import {getOpenOrdersFromVendors} from './service/mail.service';
import {validateEmail} from './service/utility.service';

/****************************************************************
 *
 * Automatic FUP
 * Designed by Cristóbal Gajardo Vera
 * https://github.com/cristobalgvera/automatic-fup
 *
 *****************************************************************/

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu(UI.MENU.TITLE)
    .addSubMenu(
      ui
        .createMenu(UI.MENU.SUBMENU_1.TITLE)
        .addItem(UI.MENU.SUBMENU_1.ITEM.A, 'createFileForEachPurchaseVendor')
        .addItem(UI.MENU.SUBMENU_1.ITEM.B, 'createFileForEachRepairVendor')
    )
    .addSubMenu(
      ui
        .createMenu(UI.MENU.SUBMENU_2.TITLE)
        .addItem(UI.MENU.SUBMENU_2.ITEM.A, 'consolidatePurchases')
        .addItem(UI.MENU.SUBMENU_2.ITEM.B, 'consolidateRepairs')
    )
    .addToUi();
}

function createFileForEachPurchaseVendorAutomatic() {
  createFileForEachPurchaseVendor(true);
}

function createFileForEachRepairVendorAutomatic() {
  createFileForEachRepairVendor(true);
}

function createFileForEachPurchaseVendor(automatic?: boolean) {
  console.warn('RETRIEVING VENDORS CONTACTS TO OBTAIN PURCHASE FUP DATA START');
  const {vendors, headers, vendorsContact} = extractPurchaseDataByVendorName(
    automatic
  );
  console.warn('RETRIEVING VENDORS CONTACTS TO OBTAIN PURCHASE FUP DATA END');

  // User cancel operation
  if (!vendorsContact) return;

  console.warn('FOLDER CREATION START');
  const {
    templateSpreadsheet,
    registriesFolder,
  } = getTemplateAndCreateFolderForRegistries(COMMON.DATA_ORIGIN.PURCHASE);
  const columnNumbers = getColumnNumbers(templateSpreadsheet, headers, true);
  console.warn('FOLDER CREATION END');

  console.warn('SHEETS CREATION START');
  // Create sheet files and return a send email to vendor action for each one
  const sendEmails = createSheetFiles(
    vendors,
    vendorsContact,
    templateSpreadsheet,
    registriesFolder,
    columnNumbers,
    automatic
  );
  console.warn('SHEETS CREATION END');

  console.warn('EMAIL SENDING START');
  sendEmails.forEach(sendEmail => sendEmail());
  console.warn('EMAIL SENDING END');
}

function createFileForEachRepairVendor(automatic?: boolean) {
  console.warn('RETRIEVING VENDORS CONTACTS TO OBTAIN REPAIR FUP DATA START');
  const {vendors, headers, vendorsContact} = extractRepairDataByVendorName(
    automatic
  );
  console.warn('RETRIEVING VENDORS CONTACTS TO OBTAIN REPAIR FUP DATA END');

  // User cancel operation
  if (!vendorsContact) return;

  console.warn('FOLDER CREATION START');
  const {
    templateSpreadsheet,
    registriesFolder,
  } = getTemplateAndCreateFolderForRegistries(COMMON.DATA_ORIGIN.REPAIR);
  const columnNumbers = getColumnNumbers(templateSpreadsheet, headers, false);
  console.warn('FOLDER CREATION END');

  console.warn('SHEETS CREATION START');
  // Create sheet files and return a send email to vendor action for each one
  const sendEmails = createSheetFiles(
    vendors,
    vendorsContact,
    templateSpreadsheet,
    registriesFolder,
    columnNumbers,
    automatic
  );
  console.warn('SHEETS CREATION END');

  console.warn('EMAIL SENDING START');
  sendEmails.forEach(sendEmail => sendEmail(false));
  console.warn('EMAIL SENDING END');
}

function consolidatePurchases() {
  consolidateOpenOrders();
}

function consolidateRepairs() {
  consolidateOpenOrders(false);
}

function getOpenOrders() {
  getOpenOrdersFromVendors('2021/4/15');
}

function exportVendorsData() {
  const spreadsheet = SpreadsheetApp.openById(
    '1LCWZozWjrVwrH43aJXdpWlo7V1jdRHUUmtNC6TAkXSk'
  );
  const sheet = spreadsheet.getSheetByName('Proveedores-asignados');

  const vendorTable = new Table(sheet.getDataRange(), undefined);

  const rows: string[][] = vendorTable.getGridValues();

  type Separator = {emails: string[]; unknowns: string[]};

  const normalizeStringEmailsList = (stringEmailList: string) => {
    const re = /(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;

    const spaceSplit = stringEmailList.split(/[<>()/[\]\\,;:\s"]/);
    const groupByRegExp = spaceSplit
      .map(word => {
        const groupArray = re.exec(word);
        return groupArray ? groupArray[0] : null;
      })
      .filter(val => val);
    // const filterAt = spaceSplit.filter(word => word.includes('@'));
    const {emails, unknowns} = groupByRegExp.reduce(
      (acc, word: string) => {
        if (validateEmail(word)) acc.emails.push(word);
        else acc.unknowns.push(word);
        return acc;
      },
      {emails: [], unknowns: []} as Separator
    );

    unknowns.length && console.error({unknowns});

    return emails.length ? emails : null;
  };

  const vendorsByEmail = rows.reduce(
    (acc, [code, name, responsable, , , , , focal]) => {
      let emails = normalizeStringEmailsList(focal.toLocaleLowerCase());
      if (!emails) emails = ['NO_EMAIL_FOUND'];

      acc[emails[0]] ??= [];
      acc[emails[0]].push([code, name, responsable, ...emails]);
      return acc;
    },
    {} as {[email: string]: string[][]}
  );

  const emails = Object.keys(vendorsByEmail).map(email => [email]);
  const data = Object.values(vendorsByEmail).flat();

  const mySpreadsheet = SpreadsheetApp.openById(
    '1iWRK1BV2on5bGOmejjmKHqfCsQ7DDEeTE1AXBTRLg3E'
  );

  const purchasesSheet = mySpreadsheet.getSheetByName('COMPRAS');
  const contactSheet = mySpreadsheet.getSheetByName('CONTACTO');

  const maxColumns = data.reduce(
    (max, arr) => (arr.length > max ? arr.length : max),
    0
  );

  const toInsertData = data.map(row => {
    for (let i = 0; i < maxColumns; i++) row[i] = row[i] || null;

    return row;
  });

  purchasesSheet
    .getRange(1, 1, data.length, toInsertData[0].length)
    .setValues(toInsertData);
  contactSheet.getRange(1, 1, emails.length).setValues(emails);
}
