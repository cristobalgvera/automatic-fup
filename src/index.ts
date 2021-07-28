import {COMMON, DB} from './config';
import {createVendorFiles} from './service/assembler.service';
import {consolidateOpenOrders} from './service/drive.service';
import {getOpenOrdersFromVendors} from './service/mail.service';
import {
  automaticSendDisabled,
  disabledDueDevMode,
  serviceDisabled,
} from './service/message.service';
import {notifyDevMode, validWorkingHours} from './service/utility.service';
import {updateFupData} from './service/write.service';
import {updateVendorData} from './util/one-time';

/*
Automatic FUP
https://github.com/cristobalgvera/automatic-fup

Cristóbal Gajardo Vera
*/

function consolidatePurchases() {
  consolidateOpenOrders();
} // To be manual

function consolidateRepairs() {
  consolidateOpenOrders(false);
} // To be manual

function createFileForEachPurchaseVendor(automatic?: boolean) {
  if (notifyDevMode(automatic)) createVendorFiles(true, automatic);
} // To be manual

function createFileForEachRepairVendor(automatic?: boolean) {
  if (notifyDevMode(automatic)) createVendorFiles(false, automatic);
} // To be manual

function createFileForEachPurchaseVendorAutomatic() {
  if (COMMON.CONFIGURATION()[DB.UTIL.CONFIG.FEATURE.AUTOMATIC_PURCHASES])
    createFileForEachPurchaseVendor(true);
  else console.warn(automaticSendDisabled());
} // To be automatic

function createFileForEachRepairVendorAutomatic() {
  if (COMMON.CONFIGURATION()[DB.UTIL.CONFIG.FEATURE.AUTOMATIC_REPAIRS])
    createFileForEachRepairVendor(true);
  else console.warn(automaticSendDisabled());
} // To be automatic

function getOpenOrders() {
  if (!COMMON.DEV_MODE()) getOpenOrdersFromVendors();
  else console.warn(disabledDueDevMode());
} // To be automatic

function getOpenOrdersDevMode() {
  getOpenOrdersFromVendors();
}

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
} // To be automatic

function BYPASScreateFileForEachPurchaseVendorAutomatic() {
  createFileForEachPurchaseVendor(true);
} // To be automatic

function BYPASScreateFileForEachRepairVendorAutomatic() {
  createFileForEachRepairVendor(true);
} // To be automatic

function test() {
  updateVendorData();
}
