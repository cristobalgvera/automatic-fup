import {changeVendorId} from './change-vendor-id.one-time';
import {exportPurchaseVendorData} from './export-purchase-vendor-data.one-time';
import {exportRepairVendorData} from './export-repair-vendor-data.one-time';
import {validateUsedVendors} from './validate-used-vendors.one-time';

export function filterPurchaseVendorData() {
  exportPurchaseVendorData();
  changeVendorId('C - ', 'COMPRAS');
}

export function filterRepairVendorData() {
  exportRepairVendorData();
  changeVendorId('R - ', 'REPARACIONES SSC');
  changeVendorId('R - ', 'REPARACIONES BRA');
}

export function validatePurchasesByCode(colToPut?: number) {
  validateUsedVendors(true, true, colToPut);
}
