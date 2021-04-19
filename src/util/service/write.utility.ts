import {PurchaseOrder} from '../schema/purchase-order.schema';
type Sheet = GoogleAppsScript.Spreadsheet.Sheet;

function _utilitiesToUpdateFupData(
  sheet: Sheet,
  rowNumberByKey: {[name: string]: number},
  firstColumnToEdit: number,
  totalColumns: number
) {
  const updateSheet = (purchaseOrder: PurchaseOrder) => {
    const {
      id,
      status,
      esd,
      shippedDate,
      qtyShipped,
      awb,
      comments,
    } = purchaseOrder;
    const rowNumber = rowNumberByKey[id];
    if (!rowNumber) return null;

    const vendorData = [[status, esd, shippedDate, qtyShipped, awb, comments]];
    sheet
      .getRange(rowNumber, firstColumnToEdit, 1, totalColumns)
      .setValues(vendorData);

    purchaseOrder.audit.updatedInSheet = true;
    return purchaseOrder;
  };

  return {actions: {updateSheet}};
}

export {_utilitiesToUpdateFupData};
