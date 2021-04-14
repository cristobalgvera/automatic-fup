import {FOLDER_ID, TEMPLATE, UI} from '../../config';

function _setBaseData(isPurchase: boolean) {
  return {
    openOrdersId: isPurchase
      ? FOLDER_ID.TO_CONSOLIDATE.PURCHASES
      : FOLDER_ID.TO_CONSOLIDATE.REPAIRS,
    folderName: UI.FOLDER.CONSOLIDATED.getName(isPurchase),
    consolidatedFileName: UI.FILE.CONSOLIDATED.getName(isPurchase),
    numberOfColumns: isPurchase
      ? TEMPLATE.UTIL.TOTAL_COLUMNS_PURCHASES
      : TEMPLATE.UTIL.TOTAL_COLUMNS_REPAIRS,
    vendorsFolderName: UI.FOLDER.CONSOLIDATED.VENDORS.getName(),
    purchaseOrderColumnName: TEMPLATE.COLUMN.PURCHASE_ORDER,
    consolidatedFolderId: isPurchase
      ? FOLDER_ID.CONSOLIDATED.PURCHASES
      : FOLDER_ID.CONSOLIDATED.REPAIRS,
  };
}

export {_setBaseData};
