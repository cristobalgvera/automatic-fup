import {COMMON} from './common.config';

const FIREBASE = {
  URL: !COMMON.DEV_MODE()
    ? 'https://automatic-fup-no-latam-default-rtdb.firebaseio.com'
    : 'https://automatic-fup-dev-default-rtdb.firebaseio.com/',
  PATH: {
    PURCHASE_ORDER: {BASE: 'purchase-order'},
    MAIL_RECORD: {BASE: 'mail-record'},
  },
};

export {FIREBASE};
