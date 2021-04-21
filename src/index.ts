import {consolidateOpenOrders} from './service/drive.service';
import {COMMON, DB, UI} from './config';
import {getOpenOrdersFromVendors} from './service/mail.service';
import {updateFupData} from './service/write.service';
import {createVendorFiles} from './service/assembler.service';
import {
  filterPurchaseVendorData,
  filterRepairVendorData,
} from './util/one-time';
import {validateUsedVendors} from './util/one-time/validate-used-vendors.one-time';
import {notifyDevMode, validWorkingHours} from './service/utility.service';
import {checkWorker} from './service/config.service';
import {
  automaticSendDisabled,
  disabledDueDevMode,
  serviceDisabled,
} from './service/message.service';

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
  if (notifyDevMode(automatic)) createVendorFiles(true, automatic);
}

// To be manual
function createFileForEachRepairVendor(automatic?: boolean) {
  if (notifyDevMode(automatic)) createVendorFiles(false, automatic);
}

// To be automatic
function createFileForEachPurchaseVendorAutomatic() {
  if (COMMON.CONFIGURATION()[DB.UTIL.CONFIG.FEATURE.AUTOMATIC_PURCHASES])
    createFileForEachPurchaseVendor(true);
  else console.warn(automaticSendDisabled());
}

// To be automatic
function createFileForEachRepairVendorAutomatic() {
  if (COMMON.CONFIGURATION()[DB.UTIL.CONFIG.FEATURE.AUTOMATIC_REPAIRS])
    createFileForEachRepairVendor(true);
  else console.warn(automaticSendDisabled());
}

// To be automatic
function getOpenOrders() {
  if (!COMMON.DEV_MODE()) getOpenOrdersFromVendors();
  else console.warn(disabledDueDevMode());
}

function getOpenOrdersDevMode() {
  getOpenOrdersFromVendors();
}

// To be automatic
function updateOpenOrders() {
  if (COMMON.DEV_MODE()) {
    console.warn(disabledDueDevMode());
    return;
  }

  if (!validWorkingHours()) {
    console.warn(serviceDisabled());
    return;
  }

  updateFupData();
}

function filterPurchaseVendors() {
  filterPurchaseVendorData();
}

function filterRepairVendors() {
  filterRepairVendorData();
}

function validateVendors() {
  validateUsedVendors(true, true, 9);
}

function checkPurchases() {
  checkWorker.checkAutomaticPurchases();
}

function uncheckPurchases() {
  checkWorker.uncheckAutomaticPurchases();
}

function checkRepairs() {
  checkWorker.checkAutomaticRepairs();
}

function uncheckRepairs() {
  checkWorker.uncheckAutomaticRepairs();
}
