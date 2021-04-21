import {DB} from '../config';
import {
  _getConfigs,
  _toggleAutomaticFeature,
} from '../util/service/config.utility';

let _config: {[feature: string]: boolean};

function _setupConfiguration() {
  const {
    data: {configs},
    columns: {featureCol, stateCol},
  } = _getConfigs();

  _config ??= {};
  configs.forEach(
    config => (_config[String(config[featureCol])] ??= !!config[stateCol])
  );

  return _config;
}

function checkAutomaticPurchases() {
  _toggleAutomaticFeature(DB.UTIL.CONFIG.FEATURE.AUTOMATIC_PURCHASES, true);
}

function uncheckAutomaticPurchases() {
  _toggleAutomaticFeature(DB.UTIL.CONFIG.FEATURE.AUTOMATIC_PURCHASES, false);
}

function checkAutomaticRepairs() {
  _toggleAutomaticFeature(DB.UTIL.CONFIG.FEATURE.AUTOMATIC_REPAIRS, true);
}

function uncheckAutomaticRepairs() {
  _toggleAutomaticFeature(DB.UTIL.CONFIG.FEATURE.AUTOMATIC_REPAIRS, false);
}

const checkWorker = {
  checkAutomaticPurchases,
  checkAutomaticRepairs,
  uncheckAutomaticPurchases,
  uncheckAutomaticRepairs,
};

export {_setupConfiguration, _config, checkWorker};
