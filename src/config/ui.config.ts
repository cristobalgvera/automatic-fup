import {VendorContact} from '../util/interface/vendor-contact.interface';
import {today, todayNoYear} from '../service/utility.service';

const UI = {
  MENU: {
    TITLE: 'Follow Up',
    SUBMENU_1: {
      TITLE: 'Enviar correos',
      ITEM: {
        A: 'Compras',
        B: 'Reparaciones',
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
  FOLDER: {
    REGISTRIES: {
      getName: (dataOrigin: string) => `[${today()}] ${dataOrigin}`,
    },
    CONSOLIDATED: {
      getName: (isPurchase: boolean) =>
        `[${today()}] ${isPurchase ? 'COMPRAS' : 'REPARACIONES'}`,
      VENDORS: {
        getName: () => 'Vendors',
      },
    },
    EMAIL_AUTOMATED_READS: {
      getName: () => `[${today()}] LECTURA AUTOMÁTICA`,
      INVALID_FORMAT: {
        getName: () => 'SIN FORMATO',
      },
      PURCHASES_FOLDER: 'COMPRAS',
      REPAIRS_FOLDER: 'REPARACIONES',
    },
    TEMPORAL: {
      getName: () => `[${today()}] temp`,
    },
  },
  FILE: {
    CONSOLIDATED: {
      getName: (isPurchase: boolean) =>
        `${today()} - CONSOLIDADO ${isPurchase ? 'COMPRAS' : 'REPARACIONES'}`,
    },
  },
  MODAL: {
    TO_SEARCH_VENDORS: 'Los siguientes vendors serán filtrados',
    NO_DATA_VENDORS:
      'Hay vendors con problemas, ¿continuar? (no se les notificará)',
    SUFFIX: {
      NO_LINKED_VENDOR_NAMES: '(sin nombres asociados)',
      NO_PURCHASE_ORDERS: '(sin purchase orders)',
      NO_EMAIL: '(correo de contacto inválido)',
    },
    ERROR: 'Ha habido un error',
    errorSendingEmailTo: ({name, email}: VendorContact) =>
      `No se ha podido enviar correo a ${name} (${email}), ¿reintentar?`,
  },
  MAIL: {
    subject: () => `Status OPEN ORDERS ${todayNoYear()}`,
    REPLY_TO: '',
    NAME: 'LATAM Airlines',
  },
};

export {UI};
