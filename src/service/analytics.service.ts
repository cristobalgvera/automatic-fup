import {ANALYTICS} from '../config';
import {DATA_ORIGIN} from '../util/enum/data-origin.enum';
import {HeaderNumber} from '../util/interface/header-number.interface';
import {PurchaseOrder} from '../util/schema/purchase-order.schema';
import {_utilitiesToStoreData} from '../util/service/analytics.util';
import {toStoreDataLog} from './message.service';

function storeData(purchaseOrders: PurchaseOrder[], setSendDate?: boolean) {
  const {
    sheet,
    data: {headersNumber, storedData},
    actions: {createRow, setRequiredFormat},
  } = _utilitiesToStoreData();

  // Arrays with AnalyticsRaw types on headers positions
  const formattedData = purchaseOrders
    .map(purchaseOrder => setRequiredFormat(purchaseOrder, setSendDate))
    .map(createRow);
  const toStoreData: unknown[][] = [];
  const idCol = headersNumber[ANALYTICS.COLUMN.FIREBASE.id];
  const sendDateCol = headersNumber[ANALYTICS.COLUMN.FIREBASE.sendDate];

  for (const data of formattedData) {
    const rowNumber = storedData.findIndex(
      storedRow => String(storedRow[idCol]) === String(data[idCol])
    );

    if (rowNumber === -1) toStoreData.push(data);
    else {
      if (!setSendDate) {
        const toUpdateData = storedData[rowNumber];
        data.splice(sendDateCol, 1, toUpdateData[sendDateCol]);
      }

      storedData.splice(rowNumber, 1, [...data]);
    }
  }

  console.log(
    toStoreDataLog({
      news: toStoreData.length,
      toUpdate: formattedData.length - toStoreData.length,
    })
  );

  const finalData = [...storedData, ...toStoreData];

  sheet
    .getRange(2, 1, finalData.length, finalData[0].length)
    .setValues(finalData);

  SpreadsheetApp.flush();
}

// Used to reset analytics data
function restoreStoredSentData() {
  const PURCHASES = 'COMPRAS';
  const purchaseOrders: (string | number | Date)[][] = [];

  const registriesFolder = DriveApp.getFolderById(
    '1-EglqcFUD9WKzJSKt6Q9S3bPpE_Q04tC'
  );
  const folders = registriesFolder.getFolders();

  while (folders.hasNext()) {
    const folder = folders.next();
    const folderName = folder.getName();
    const [day, month, year] = folderName.split(/[[\]]/)[1].split('-');
    const now = new Date(`${month}/${day}/${year}`);
    const isPurchase = folderName.includes(PURCHASES);
    const files = folder.getFiles();

    console.warn(`Iterating over folder: '${folderName}'`);

    while (files.hasNext()) {
      const file = files.next();
      const fileName = file.getName();
      console.log(`Iterating over file: '${fileName}'`);

      const spreadsheet = SpreadsheetApp.open(file);
      const sheet = spreadsheet.getSheets()[0];

      const headers: string[] = sheet
        .getRange(2, 1, 1, sheet.getLastColumn())
        .getValues()[0];
      const headersNames = Object.entries(ANALYTICS.COLUMN.FIREBASE);

      const headersNumber = headersNames.reduce(
        (acc: HeaderNumber, [, headerName]) => {
          const headerNumber = headers.indexOf(headerName);

          if (headerNumber === -1) return acc;

          return {...acc, [headerName]: headerNumber};
        },
        {}
      );

      const storedData: string[][] = sheet
        .getDataRange()
        .getValues()
        .map(row => row.map(String));

      storedData.shift();
      storedData.shift();

      const toStoreData = storedData.map(row => {
        const poCol = headersNumber['Purchase Order'];
        const lineCol = headersNumber['Line'];
        const qtyPendingCol = headersNumber['Qty Pending'];
        const partNumber = headersNumber['Part Number'];

        const key = `${row[poCol]}${row[lineCol] ?? 1}`;
        return [
          key,
          row[poCol],
          +(row[lineCol] ?? 1),
          qtyPendingCol ? +row[qtyPendingCol] : null,
          row[partNumber],
          isPurchase ? DATA_ORIGIN.PURCHASE : DATA_ORIGIN.REPAIR,
          now,
        ];
      });

      purchaseOrders.push(...toStoreData);

      console.log(
        `'${toStoreData.length}' purchases orders found | TOTAL: ${purchaseOrders.length}`
      );
    }
  }

  const {
    sheet,
    data: {headersNumber},
  } = _utilitiesToStoreData();

  const times = Object.keys(headersNumber).length - 6;
  const toConcat = [];
  for (let i = 0; i < times; i++) {
    toConcat.push(undefined);
  }

  const expandedPurchaseOrders = purchaseOrders.map(purchaseOrder =>
    purchaseOrder.concat(toConcat)
  );

  sheet
    .getRange(
      2,
      1,
      expandedPurchaseOrders.length,
      expandedPurchaseOrders[0].length
    )
    .setValues(expandedPurchaseOrders);
}

export {storeData, restoreStoredSentData};
