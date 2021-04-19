import {consolidateOpenOrders} from './service/drive.service';
import {UI} from './config';
import {getOpenOrdersFromVendors} from './service/mail.service';
import {updateFupData} from './service/write.service';
import {createVendorFiles} from './service/assembler.service';
import {
  filterPurchaseVendorData,
  filterRepairVendorData,
  validatePurchasesByCode,
} from './util/one-time';

/****************************************************************
 *
 *                   ***********************
 *                   **   AUTOMATIC FUP   **
 *                   ***********************
 *
 *             Designed by Cristóbal Gajardo Vera
 *        https://github.com/cristobalgvera/automatic-fup
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

// To be manual
function consolidatePurchases() {
  consolidateOpenOrders();
}

// To be manual
function consolidateRepairs() {
  consolidateOpenOrders(false);
}

// To be manual
function createFileForEachPurchaseVendor(automatic?: boolean) {
  createVendorFiles(true, automatic);
}

// To be manual
function createFileForEachRepairVendor(automatic?: boolean) {
  createVendorFiles(false, automatic);
}

// To be automatic
function createFileForEachPurchaseVendorAutomatic() {
  createFileForEachPurchaseVendor(true);
}

// To be automatic
function createFileForEachRepairVendorAutomatic() {
  createFileForEachRepairVendor(true);
}

// To be automatic
function getOpenOrders() {
  getOpenOrdersFromVendors();
}

// To be automatic
function updateOpenOrders() {
  updateFupData();
}

function filterPurchaseVendors() {
  filterPurchaseVendorData();
}

function filterRepairVendors() {
  filterRepairVendorData();
}

function validatePurchases() {
  validatePurchasesByCode(9);
}
