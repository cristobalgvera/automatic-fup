import {storeData} from '../../service/analytics.service';
import {PurchaseOrder} from '../schema/purchase-order.schema';

export function uploadToAnalytics() {
  const dayFolderId = '1lJzzp22DEhN4xxzm5dMFwVSTWN43c17K';
  const isPurchase = true;

  const folder = DriveApp.getFolderById(dayFolderId);
  const files = folder.getFiles();
  const analyticsData: PurchaseOrder[] = [];

  while (files.hasNext()) {
    const file = files.next();
    const spreadsheet = SpreadsheetApp.openById(file.getId());
    const sheet = spreadsheet.getSheetByName('Open Orders');

    const purchaseOrders = sheet
      .getRange(3, 1, sheet.getLastRow() - 2, 4)
      .getValues();

    purchaseOrders.forEach(([purchaseOrder, line, qtyPending, partNumber]) =>
      analyticsData.push({
        id: `${purchaseOrder}${line ?? 1}`,
        purchaseOrder,
        line,
        qtyPending,
        partNumber,
        vendorName: undefined,
        audit: {
          isPurchase,
          updatedInSheet: false,
        },
      })
    );
  }

  storeData(analyticsData, true);
}
