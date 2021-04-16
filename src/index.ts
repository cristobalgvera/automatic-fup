import {
  consolidateOpenOrders,
  createSheetFiles,
  getTemplateAndCreateFolderForRegistries,
} from './service/drive.service';
import {
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
        .addItem(UI.MENU.SUBMENU_1.ITEM.A, 'createFileForEachRepairVendor')
    )
    .addSubMenu(
      ui
        .createMenu(UI.MENU.SUBMENU_2.TITLE)
        .addItem(UI.MENU.SUBMENU_2.ITEM.A, 'consolidatePurchases')
        .addItem(UI.MENU.SUBMENU_2.ITEM.B, 'consolidateRepairs')
    )
    .addToUi();
}

function createFileForEachRepairVendorAutomatic() {
  createFileForEachRepairVendor(true);
}

function createFileForEachRepairVendor(automatic = false) {
  const {vendors, headers, vendorsContact} = extractRepairDataByVendorName(
    automatic
  );

  // User cancel operation
  if (!vendorsContact) return;

  const {
    templateSpreadsheet,
    registriesFolder,
  } = getTemplateAndCreateFolderForRegistries(COMMON.DATA_ORIGIN.REPAIR);
  const columnNumbers = getColumnNumbers(templateSpreadsheet, headers, false);

  // Create sheet files and return a send email to vendor action for each one
  const sendEmails = createSheetFiles(
    vendors,
    vendorsContact,
    templateSpreadsheet,
    registriesFolder,
    columnNumbers
  );
  sendEmails.forEach(sendEmail => sendEmail());
}

function consolidatePurchases() {
  consolidateOpenOrders();
}

function consolidateRepairs() {
  consolidateOpenOrders(false);
}

function getOpenOrders() {
  getOpenOrdersFromVendors('2021/4/13');
}
