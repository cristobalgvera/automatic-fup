import {consolidateOpenOrders} from './service/drive.service';
import {COMMON, DB, UI} from './config';
import {getOpenOrdersFromVendors} from './service/mail.service';
import {updateFupData} from './service/write.service';
import {createVendorFiles} from './service/assembler.service';
import {notifyDevMode, validWorkingHours} from './service/utility.service';
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

// To be automatic
function BYPASScreateFileForEachPurchaseVendorAutomatic() {
  createFileForEachPurchaseVendor(true);
}

// To be automatic
function BYPASScreateFileForEachRepairVendorAutomatic() {
  createFileForEachRepairVendor(true);
}
