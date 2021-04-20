import {DB} from './db.config';

// By default, dev mode is falsy... business stuffs
let DEV_MODE: boolean;

const COMMON = {
  // DEV_MODE: (() => DEV_MODE ?? isDevMode()).call(null) as boolean,
  DEV_MODE: () => DEV_MODE ?? isDevMode(),
  UTIL: {
    LOCALE: 'es-CL',
    FILE_EXTENSION: {
      XLSX: 'xlsx',
    },
  },
  EMAIL: {
    LATAM_SENDERS: [
      'cristobal.gajardo@latam.com',
      'phillip.johnson@latam.com',
      'claudia.guzmano@latam.com',
    ],
    TO_COPY: {
      PURCHASES: ['gabatec@lan.com', 'erick.burgoa@latam.com'],
      REPAIRS: ['gruporeparaciones@lanchile.com'],
    },
  },
};

function isDevMode() {
  const spreadsheet = SpreadsheetApp.openById(DB.ID);
  const sheet = spreadsheet.getSheetByName(DB.SHEET.DEV);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const isDevCol = headers.indexOf(DB.COLUMN.DEV_MODE) + 1;
  const devMode = headers[isDevCol] as boolean;
  devMode && console.log({devMode});
  DEV_MODE = devMode;
  return devMode;
}

export {COMMON};
