import {ANALYTICS} from '../config';
import {PurchaseOrder} from '../util/schema/purchase-order.schema';
import {_utilitiesToStoreData} from '../util/service/analytics.util';

function storeData(purchaseOrders: PurchaseOrder[]) {
  const {
    sheet,
    headersNumber,
    actions: {createRow, setRequiredFormat},
  } = _utilitiesToStoreData();

  const storedData: string[][] = sheet.getDataRange().getValues();
  storedData.shift();

  // Arrays with AnalyticsRaw types on headers positions
  const formattedData = purchaseOrders.map(setRequiredFormat).map(createRow);
  const toStoreData: unknown[][] = [];
  const idCol = headersNumber[ANALYTICS.COLUMN.FIREBASE.id];

  for (const data of formattedData) {
    const rowNumber = storedData.findIndex(
      storedRow => storedRow[idCol] === data[idCol]
    );
    if (rowNumber === -1) toStoreData.push(data);
    else storedData.splice(rowNumber, 1, [...data]);
  }

  const finalData = [...storedData, ...toStoreData];

  sheet
    .getRange(2, 1, finalData.length, Object.keys(headersNumber).length)
    .setValues(finalData);

  SpreadsheetApp.flush();
}

export {storeData};
