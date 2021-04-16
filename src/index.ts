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
import {COMMON, UI} from './config';
import {getOpenOrdersFromVendors} from './service/mail.service';

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
