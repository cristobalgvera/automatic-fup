import {_config, _setupConfiguration} from '../service/config.service';
import {DB} from './db.config';

const COMMON = {
  DEV_MODE: () => {
    const feature = DB.UTIL.CONFIG.FEATURE.DEV_MODE;

    return _config ? _config[feature] : _setupConfiguration()[feature];
  },
  CONFIGURATION: () => _config ?? _setupConfiguration(),
  UTIL: {
    LOCALE: 'es-CL',
    FILE_EXTENSION: {
      XLSX: 'xlsx',
      XLS: 'xls',
    },
    WORKING_HOURS: {
      MIN: 8 + 4, // GMT -4
      MAX: 19 + 4, // GMT -4
    },
    OPEN_ORDERS_TO_UPDATE_EACH_TIME: 60,
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

export {COMMON};
