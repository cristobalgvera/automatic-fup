const PURCHASE_DATA = {
  ID: '1zuf5oNcS5-kZNR5v2pCisgXGRuu2UUqAa0bz_k5WvOM',
  SHEET: {
    ACTUAL: 'Actual',
  },
  COLUMN: {
    RO_NUMBER: 'ORDEN',
    PART_NUMBER: '',
    LINE: 'ORDEN_LINE',
    VENDOR_NAME: 'VENDOR_NAME',
  },
  UTIL: {
    FILTER_COLUMNS: {
      HITO_RADAR: 'HITO_RADAR',
      FUP_STATUS_ACTUAL: 'FUP_STATUS_ACTUAL',
      ACK: 'ACK',
    },
    FILTERS: {
      HITO_RADAR: ['Vendor', 'Vendor Sin Quote'],
      FUP_STATUS_ACTUAL: [
        'PENDING SUPPLIER',
        'VENDOR ON HOLD',
        'Shipment scheduled',
        'PEND SUPPLIER',
      ],
      ACK: ['SI', 'NO'],
    },
    SORT_COLUMNS: {VENDOR_NAME: 'VENDOR_NAME'},
  },
};

export {PURCHASE_DATA};
