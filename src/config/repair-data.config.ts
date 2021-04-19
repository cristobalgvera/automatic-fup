import {RESPONSIBLE} from '../util/enum/responsible.enum';

const REPAIR_DATA = {
  ID: '1jub6SfL1l8e7oDa1L2GuklQHOBydqFZIbwWC9gNrCo4',
  FUP: {
    ID: '1XTw--ITO81CTzBbvJgocPgv27gngRXYF6TvccupAbeE',
    SHEET: {
      ACTUAL: 'Actual',
    },
    COLUMN: {
      RO_NUMBER: 'RO Number',
    },
  },
  SHEET: {
    ACTUAL: 'Actual',
  },
  COLUMN: {
    RO_NUMBER: 'RO_Number',
    PART_NUMBER: 'PART_NUMBER',
    LINE: '',
    VENDOR_NAME: 'VENDOR_NAME',
    VENDOR_CODE: 'VENDOR_CODE',
  },
  UTIL: {
    FILTER_COLUMNS: {
      HITO_RADAR: 'Hito_Radar',
      RESPONSIBLE: 'RESPONSIBLE',
      SYSTEM: 'Sistema',
    },
    FILTERS: {
      HITO_RADAR: ['Vendor', 'Vendor Sin Quote'],
      RESPONSIBLE: [RESPONSIBLE.VENDOR.toString()],
      SYSTEM: ['SSC', 'BRA'],
    },
    SORT_COLUMNS: {VENDOR_NAME: 'VENDOR_NAME', VENDOR_CODE: 'VENDOR_CODE'},
    VENDOR_DATA_COLUMNS: {
      PO_STATUS: 'PO Status',
      ESD: 'ESD',
      SHIPPED_DATE: 'Shipped Date',
      QTY_SHIPPED: 'Qty Shipped',
      AWB: 'AWB',
      COMMENTS: 'Comments',
      ACTION: 'Acción',
      RESPONSIBLE: 'Responsable',
    },
  },
};

export {REPAIR_DATA};
