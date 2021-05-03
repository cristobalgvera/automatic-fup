import {PO_STATUS} from '../util/enum/po-status.enum';
import {RESPONSIBLE} from '../util/enum/responsible.enum';

const REPAIR_DATA = {
  ID: '1XTw--ITO81CTzBbvJgocPgv27gngRXYF6TvccupAbeE',
  SHEET: {
    ACTUAL: 'Actual',
  },
  COLUMN: {
    RO_NUMBER: 'RO Number',
    PART_NUMBER: 'Part Number',
    VENDOR_NAME: 'Vendor Name',
    VENDOR_CODE: 'Vendor Code',
  },
  UTIL: {
    FILTER_COLUMNS: {
      STATUS: 'Status',
      PO_STATUS: 'PO Status',
      RESPONSIBLE: 'Responsable Acción',
      SYSTEM: 'Sistema',
      BUYER_MANAGEMENT: 'Gestión',
    },
    FILTERS: {
      STATUS: ['Proveedor'],
      RESPONSIBLE: [RESPONSIBLE.VENDOR].map(String),
      SYSTEM: ['SSC', 'BRA'],
      PO_STATUS: [
        PO_STATUS.NOT_RECEIVED,
        PO_STATUS.AWAITING_QUOTE_APPROVAL,
        PO_STATUS.AWAITING_CIA_PAYMENT,
        PO_STATUS.OTHER_CUSTOMER_HOLD,
      ].map(String),
    },
    SORT_COLUMNS: {VENDOR_NAME: 'Vendor Name', VENDOR_CODE: 'Vendor Code'},
    VENDOR_DATA_COLUMNS: {
      PO_STATUS: 'PO Status',
      ESD: 'ESD',
      SHIPPED_DATE: 'Shipped Date',
      QTY_SHIPPED: 'Qty Shipped',
      AWB: 'AWB',
      COMMENTS: 'Comments',
      ACTION: 'Acción',
      RESPONSIBLE: 'Responsable Acción',
    },
  },
};

export {REPAIR_DATA};
