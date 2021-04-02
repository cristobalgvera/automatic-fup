const {
  COMMON,
  UI,
  DATA,
  DB,
  FOLDER_ID,
  TEMPLATE,
} = {
  COMMON: {
    DEFAULT: {
      FILTER_TEXT: 'Vendor',
    },
    UTIL: {
      TIME_ZONE: 'America/Santiago',
      LOCALE: 'es-CL',
      FILE_EXTENSION: {
        XLSX: 'xlsx'
      },
    },
  },
  UI: {
    MENU: {
      TITLE: 'Follow Up',
      SUBMENU_1: {
        TITLE: 'Enviar correos',
        ITEM: {
          A: 'Proveedores',
        },
      },
      SUBMENU_2: {
        TITLE: 'Consolidar',
        ITEM: {
          A: 'Compras',
          B: 'Reparaciones',
        },
      },
    },
    MODAL: {
      TO_SEARCH_VENDORS: 'Vendors a filtrar',
      NO_DATA_VENDORS: 'Hay vendors sin POs, ¿continuar?',
      SUFFIX: {
        NO_LINKED_VENDOR_NAMES: '(sin nombres asociados)',
        NO_PURCHASE_ORDERS: '(sin purchase orders)',
      },
    },
    FOLDER: {
      REGISTRIES: {
        getName: () => `[${today()}] REGISTROS`,
      },
      CONSOLIDATED: {
        getName: (isPurchase) => `[${today()}] ${isPurchase ? 'COMPRAS' : 'REPARACIONES'}`,
        VENDORS: {
          getName: () => `Vendors`,
        },
      },
      RESPONSES: {
        getName: () => ``,
      },
    },
    FILE: {
      CONSOLIDATED: {
        getName: (isPurchase) => `[${today()}] CONSOLIDADO ${isPurchase ? 'COMPRAS' : 'REPARACIONES'}`,
      },
    },
    MAIL: {
      subject: () => `Status OPEN ORDERS ${todayNoYear()}`,
      REPLY_TO: '',
      NAME: 'LATAM Airlines',
    },
  },
  DATA: {
    ID: '12EsiShi1Vo-czK3amQrlR5FGKse4lFIHdQS293mmxEA',
    SHEET: {
      ACTUAL: 'Actual',
    },
    COLUMN: {
      RO_NUMBER: 'RO_Number',
      PART_NUMBER: 'PART_NUMBER',
      LINE: '',
    },
    UTIL: {
      FILTER_COLUMN: 'Hito_Radar',
      SORT_COLUMN: 'VENDOR_NAME',
    },
  },
  DB: {
    ID: '1k_YcNsVhS5I_01fICPNNieHWCzdxhyQdJTQSyaEvSiw',
    SHEET: {
      LINKED_VENDOR_NAME: 'Linked Vendor Name',
      VENDOR: 'Vendor',
    },
    COLUMN: {
      VENDOR_ID: 'VendorId',
      VENDOR_NAME: 'Name',
      ID: 'Id',
    },
  },
  FOLDER_ID: {
    MAIN: '1UO_aoVH3aW4lGF1dpZbaF20Uon17WyBv',
    PURCHASE_ORDERS: '175uiKnAPJcjc_tgUipe4o4d_waU8vUtP',
    REPAIR_ORDERS: '1Xpb2AF5jkqDDbB0jxy3_lmpHDG8zifDC',
    CONSOLIDATED: {
      PURCHASES: '1zlCjgU_CrhAXKFRoNnOBIh38WAEGVMzR',
      REPAIRS: '1y4hPi7v_NQ2F2pM-qZ6_1P6EvICTVDiK',
    },
  },
  TEMPLATE: {
    ID: '1fUxA_8WbypaQxifwepWa3cr_3CsxQw5a6tko4ZHLpns',
    SHEET: {
      PURCHASE: 'Compras'
    },
    COLUMN: {
      PURCHASE_ORDER: 'Purchase Order',
      PART_NUMBER: 'Part Number',
      LINE: 'Line',
    },
    UTIL: {
      LEFT_MOST_COLUMN: 'AWB',
      INITIAL_ROWS: 1000,
    }
  }
}