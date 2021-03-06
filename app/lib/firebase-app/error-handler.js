/****************************************************************
 * ErrorHandler library
 * https://github.com/RomainVialard/ErrorHandler
 *
 * Performs exponential backoff when needed
 * And makes sure that caught errors are correctly logged in Stackdriver
 *
 * expBackoff()
 * urlFetchWithExpBackOff()
 * logError()
 * getNormalizedError()
 * getErrorLocale()
 *
 * NORMALIZED_ERRORS
 * NORETRY_ERRORS
 *****************************************************************/

/**
 * Invokes a function, performing up to 5 retries with exponential backoff.
 * Retries with delays of approximately 1, 2, 4, 8 then 16 seconds for a total of
 * about 32 seconds before it gives up and rethrows the last error.
 * See: https://developers.google.com/google-apps/documents-list/#implementing_exponential_backoff
 * Original author: peter.herrmann@gmail.com (Peter Herrmann)
 *
 * @example
 * // Calls an anonymous function that concatenates a greeting with the current Apps user's email
 * ErrorHandler.expBackoff(function(){return "Hello, " + Session.getActiveUser().getEmail();});
 *
 * @example
 * // Calls an existing function
 * ErrorHandler.expBackoff(myFunction);
 *
 * @param {Function} func - The anonymous or named function to call.
 *
 * @param {Object} [options] - options for exponential backoff
 * @param {boolean} [options.throwOnFailure] - default to FALSE, if true, throw the ErrorHandler_.CustomError on failure
 * @param {boolean} [options.doNotLogKnownErrors] - default to FALSE, if true, will not log known errors to stackdriver
 * @param {boolean} [options.verbose] - default to FALSE, if true, will log a warning on a successful call that failed at least once
 * @param {number} [options.retryNumber] - default to 5, maximum number of retry on error
 *
 * @return {* | ErrorHandler_.CustomError} - The value returned by the called function, or ErrorHandler_.CustomError on failure if throwOnFailure == false
 */
function expBackoff(func, options) {
  // enforce defaults
  options = options || {};

  let retry = options.retryNumber || 5;
  if (retry < 1 || retry > 6) retry = 5;

  let previousError = null;
  let retryDelay = null;
  let oldRetryDelay = null;
  let customError;

  // execute func() then retry <retry> times at most if errors
  for (let n = 0; n <= retry; n++) {
    // actual exponential backoff
    n &&
      Utilities.sleep(
        retryDelay ||
          Math.pow(2, n - 1) * 1000 + Math.round(Math.random() * 1000)
      );

    var response = undefined;
    var error = undefined;

    let noError = true;
    var isUrlFetchResponse = false;

    // Try / catch func()
    try {
      response = func();
    } catch (err) {
      error = err;
      noError = false;
    }

    // Handle retries on UrlFetch calls with muteHttpExceptions
    if (noError && response && typeof response.getResponseCode === 'function') {
      isUrlFetchResponse = true;

      const responseCode = response.getResponseCode();

      // Only perform retries on error 500 for now
      if (responseCode === 500) {
        error = response;
        noError = false;
      }
    }

    // Return result that is not an error
    if (noError) {
      if (n && options.verbose) {
        const info = {
          context: 'Exponential Backoff',
          successful: true,
          numberRetry: n,
        };

        retryDelay && (info.retryDelay = retryDelay);

        ErrorHandler.logError(previousError, info, {
          asWarning: true,
          doNotLogKnownErrors: options.doNotLogKnownErrors,
        });
      }

      return response;
    }
    previousError = error;
    oldRetryDelay = retryDelay;
    retryDelay = null;

    // Process error retry
    if (!isUrlFetchResponse && error && error.message) {
      const variables = [];
      const normalizedError = ErrorHandler.getNormalizedError(
        error.message,
        variables
      );

      // If specific error that explicitly give the retry time
      if (
        normalizedError ===
          ErrorHandler.NORMALIZED_ERRORS
            .USER_RATE_LIMIT_EXCEEDED_RETRY_AFTER_SPECIFIED_TIME &&
        variables[0] &&
        variables[0].value
      ) {
        retryDelay =
          new Date(variables[0].value).getTime() - new Date().getTime() + 1000;

        oldRetryDelay &&
          ErrorHandler.logError(
            error,
            {
              failReason: 'Failed after waiting ' + oldRetryDelay + 'ms',
              context: 'Exponential Backoff',
              numberRetry: n,
              retryDelay: retryDelay,
            },
            {
              asWarning: true,
              doNotLogKnownErrors: options.doNotLogKnownErrors,
            }
          );

        // Do not wait too long
        if (retryDelay < 32000) continue;

        customError = ErrorHandler.logError(
          error,
          {
            failReason: 'Retry delay > 31s',
            context: 'Exponential Backoff',
            numberRetry: n,
            retryDelay: retryDelay,
          },
          {doNotLogKnownErrors: options.doNotLogKnownErrors}
        );

        if (options.throwOnFailure) throw customError;
        return customError;
      }

      // Check for errors thrown by Google APIs on which there's no need to retry
      // eg: "Access denied by a security policy established by the administrator of your organization.
      //      Please contact your administrator for further assistance."
      if (!ErrorHandler.NORETRY_ERRORS[normalizedError]) continue;

      customError = ErrorHandler.logError(
        error,
        {
          failReason: 'No retry needed',
          numberRetry: n,
          context: 'Exponential Backoff',
        },
        {doNotLogKnownErrors: options.doNotLogKnownErrors}
      );

      if (options.throwOnFailure) throw customError;
      return customError;
    }
  }

  // Action after last re-try
  if (isUrlFetchResponse) {
    ErrorHandler.logError(
      new Error(response.getContentText()),
      {
        failReason: 'Max retries reached',
        urlFetchWithMuteHttpExceptions: true,
        context: 'Exponential Backoff',
      },
      {doNotLogKnownErrors: options.doNotLogKnownErrors}
    );

    return response;
  }

  // Investigate on errors that are still happening after 5 retries
  // Especially error "Not Found" - does it make sense to retry on it?
  customError = ErrorHandler.logError(
    error,
    {
      failReason: 'Max retries reached',
      context: 'Exponential Backoff',
    },
    {doNotLogKnownErrors: options.doNotLogKnownErrors}
  );

  if (options.throwOnFailure) throw customError;
  return customError;
}

/**
 * Helper function to automatically handles exponential backoff on UrlFetch use
 *
 * @param {string} url
 * @param {Object} [params]
 * @param {Object} [expBackoffOptions] - options for exponential backoff - see expBackoff() function
 *
 * @return {UrlFetchApp.HTTPResponse}  - fetch response
 */
function urlFetchWithExpBackOff(url, params, expBackoffOptions) {
  params = params || {};

  params.muteHttpExceptions = true;

  return ErrorHandler.expBackoff(() => {
    return UrlFetchApp.fetch(url, params);
  }, expBackoffOptions);
}

/**
 * @typedef {Error} ErrorHandler_.CustomError
 *
 * @property {{
 *   locale: string,
 *   originalMessage: string,
 *   knownError: boolean,
 *   variables: Array<{}>,
 *   errorName: string,
 *   reportLocation: {
 *     lineNumber: number,
 *     filePath: string,
 *     directLink: string,
 *   },
 * }} context
 */

/**
 * If we simply log the error object, only the error message will be submitted to Stackdriver Logging
 * Best to re-write the error as a new object to get lineNumber & stack trace
 *
 * @param {(string | Error | object)} error
 * @param {(object | {addonName: string, versionNumber: number})} [additionalParams]
 *
 * @param {Object} [options] - Options for logError
 * @param {boolean} [options.asWarning] - default to FALSE, use console.warn instead console.error
 * @param {boolean} [options.doNotLogKnownErrors] - default to FALSE, if true, will not log known errors to stackdriver
 *
 * @return {ErrorHandler_.CustomError}
 */
function logError(error, additionalParams, options) {
  options = options || {};

  error = typeof error === 'string' ? new Error(error) : error;

  // Localize error message
  const partialMatches = [];
  const normalizedMessage = ErrorHandler.getNormalizedError(
    error.message,
    partialMatches
  );
  let message = normalizedMessage || error.message;

  let locale;
  let scriptId;
  try {
    locale = Session.getActiveUserLocale();
    scriptId = ScriptApp.getScriptId();
  } catch (err) {
    // Try to add the locale
    locale = ErrorHandler.getErrorLocale(error.message);
  }

  const log = {
    context: {
      locale: locale || '',
      originalMessage: error.message,
      knownError: !!normalizedMessage,
    },
  };

  // Add partialMatches if any
  if (partialMatches.length) {
    log.context.variables = {};

    partialMatches.forEach(match => {
      log.context.variables[match.variable] = match.value;
    });
  }

  if (error.name) {
    // examples of error name: Error, ReferenceError, Exception, GoogleJsonResponseException, HttpResponseException
    // would be nice to categorize
    log.context.errorName = error.name;
    if (error.name === 'HttpResponseException') {
      // In this case message is usually very long as it contains the HTML of the error response page
      // eg: 'Response Code: 502. Message: <!DOCTYPE html> <html lang=en>'
      // for now, shorten and only retrieve response code
      message = message.split('.')[0];
    }
    message = error.name + ': ' + message;
  }
  log.message = message;

  // allow to use a global variable instead of passing the addonName in each call
  // noinspection JSUnresolvedVariable
  const addonName =
    (additionalParams && additionalParams.addonName) ||
    ErrorHandler_._this['SCRIPT_PROJECT_TITLE'] ||
    '';

  // Manage error Stack - only compatible with DEPRECATED_ES5 runtime
  if (error.lineNumber && error.fileName && error.stack) {
    const fileName =
      (addonName && error.fileName.replace(' (' + addonName + ')', '')) ||
      error.fileName;

    log.context.reportLocation = {
      lineNumber: error.lineNumber,
      filePath: fileName,
      directLink:
        'https://script.google.com/macros/d/' +
        scriptId +
        '/edit?f=' +
        fileName +
        '&s=' +
        error.lineNumber,
    };

    const res = ErrorHandler_._convertErrorStack(error.stack, addonName);
    log.context.reportLocation.functionName = res.lastFunctionName;
    log.message += '\n    ' + res.stack;
  } else if (error.stack) {
    // In the V8 runtime, the JavaScript Error object doesn't support fileName or lineNumber
    // https://developers.google.com/apps-script/guides/v8-runtime/migration#avoid_using_errorfilename_and_errorlinenumber
    log.message += '\n    ' + error.stack;
  }

  if (error.responseCode) {
    log.context.responseCode = error.responseCode;
  }

  // allow to use a global variable instead of passing the addonName in each call
  // noinspection JSUnresolvedVariable
  const versionNumber =
    (additionalParams && additionalParams.versionNumber) ||
    ErrorHandler_._this['SCRIPT_VERSION_DEPLOYED'] ||
    '';
  if (versionNumber) {
    log.serviceContext = {
      version: versionNumber,
    };
  }

  // Add custom information
  if (additionalParams) {
    log.customParams = {};

    for (const i in additionalParams) {
      log.customParams[i] = additionalParams[i];
    }
  }

  // Send error to stackdriver log
  if (!options.doNotLogKnownErrors || !normalizedMessage) {
    if (options.asWarning) console.warn(log);
    else console.error(log);
  }

  // Return an error, with context
  const customError = new Error(normalizedMessage || error.message);
  Object.assign(customError, {context: log.context});

  return customError;
}

/**
 * Return the english version of the error if listed in this library
 *
 * @param {string} localizedErrorMessage
 * @param {Array<{
 *   variable: string,
 *   value: string
 * }>} [partialMatches] - Pass an empty array, getNormalizedError() will populate it with found extracted variables in case of a partial match
 *
 * @return {ErrorHandler_.NORMALIZED_ERROR | ''} the error in English or '' if no matching error was found
 */
function getNormalizedError(localizedErrorMessage, partialMatches) {
  /**
   * @type {ErrorHandler_.ErrorMatcher}
   */
  const error =
    ErrorHandler_._ERROR_MESSAGE_TRANSLATIONS[localizedErrorMessage];

  if (error) return error.ref;
  if (typeof localizedErrorMessage !== 'string') return '';

  // No exact match, try to execute a partial match
  let match;

  /**
   * @type {ErrorHandler_.PartialMatcher}
   */
  let matcher;

  for (let i = 0; (matcher = ErrorHandler_._ERROR_PARTIAL_MATCH[i]); i++) {
    // search for a match
    match = localizedErrorMessage.match(matcher.regex);
    if (match) break;
  }

  // No match found
  if (!match) return '';

  // Extract partial match variables
  if (matcher.variables && partialMatches && Array.isArray(partialMatches)) {
    for (
      var index = 0, variable;
      (variable = matcher.variables[index]);
      index++
    ) {
      partialMatches.push({
        variable: variable,
        value: (match[index + 1] !== undefined && match[index + 1]) || '',
      });
    }
  }

  return matcher.ref;
}

/**
 * Try to find the locale of the localized thrown error
 *
 * @param {string} localizedErrorMessage
 *
 * @return {string | ''} return the locale or '' if no matching error found
 */
function getErrorLocale(localizedErrorMessage) {
  /**
   * @type {ErrorHandler_.ErrorMatcher}
   */
  const error =
    ErrorHandler_._ERROR_MESSAGE_TRANSLATIONS[localizedErrorMessage];

  if (error) return error.locale;
  if (typeof localizedErrorMessage !== 'string') return '';

  // No exact match, try to execute a partial match
  let match;

  /**
   * @type {ErrorHandler_.PartialMatcher}
   */
  let matcher;

  for (let i = 0; (matcher = ErrorHandler_._ERROR_PARTIAL_MATCH[i]); i++) {
    // search for a match
    match = localizedErrorMessage.match(matcher.regex);
    if (match) break;
  }

  // No match found
  if (!match) return '';

  return matcher.locale;
}

/**
 * @typedef {string} ErrorHandler_.NORMALIZED_ERROR
 */

/**
 * List all known Errors
 */
const NORMALIZED_ERRORS = {
  // Google Sheets
  CONDITIONNAL_RULE_REFERENCE_DIF_SHEET:
    'Conditional format rule cannot reference a different sheet.',
  TRYING_TO_EDIT_PROTECTED_CELL:
    'You are trying to edit a protected cell or object. Please contact the spreadsheet owner to remove protection if you need to edit.',
  SHEET_NOT_FOUND: 'Sheet not found',
  RANGE_NOT_FOUND: 'Range not found',
  RANGE_COORDINATES_ARE_OUTSIDE_SHEET_DIMENSIONS:
    'The coordinates of the range are outside the dimensions of the sheet.',
  RANGE_COORDINATES_INVALID:
    'The coordinates or dimensions of the range are invalid.',

  // Google Drive
  NO_ITEM_WITH_GIVEN_ID_COULD_BE_FOUND:
    'No item with the given ID could be found, or you do not have permission to access it.',
  NO_PERMISSION_TO_ACCESS_THE_REQUESTED_DOCUMENT:
    'You do not have permissions to access the requested document.',
  LIMIT_EXCEEDED_DRIVE_APP: 'Limit Exceeded: Drive\u0041pp.', // using Unicode escape sequence to avoid scope prompt
  LIMIT_EXCEEDED_DRIVE: 'Limit Exceeded: Drive.',
  ACTION_REQUIRES_SHARED_DRIVE_MEMBERSHIP:
    'API call to drive.files.list failed with error: The attempted action requires shared drive membership.',

  // Gmail / email service
  MAIL_SERVICE_NOT_ENABLED: 'Mail service not enabled',
  INVALID_THREAD_ID_VALUE: 'Invalid thread_id value',
  LABEL_ID_NOT_FOUND: 'labelId not found',
  LABEL_NAME_EXISTS_OR_CONFLICTS: 'Label name exists or conflicts',
  INVALID_LABEL_NAME: 'Invalid label name',
  NO_RECIPIENT: 'Failed to send email: no recipient',
  IMAP_FEATURES_DISABLED_BY_ADMIN: 'IMAP features disabled by administrator',
  LIMIT_EXCEEDED_MAX_RECIPIENTS_PER_MESSAGE:
    'Limit Exceeded: Email Recipients Per Message.',
  LIMIT_EXCEEDED_EMAIL_BODY_SIZE: 'Limit Exceeded: Email Body Size.',
  LIMIT_EXCEEDED_EMAIL_TOTAL_ATTACHMENTS_SIZE:
    'Limit Exceeded: Email Total Attachments Size.',
  LIMIT_EXCEEDED_EMAIL_SUBJECT_LENGTH: 'Argument too large: subject',
  GMAIL_NOT_DEFINED: '"Gmail" is not defined.',
  GMAIL_OPERATION_NOT_ALLOWED: 'Gmail operation not allowed.',

  // Google Calendar
  CALENDAR_SERVICE_NOT_ENABLED: 'Calendar service not enabled',

  // miscellaneous
  SERVER_ERROR_RETRY_LATER:
    "We're sorry, a server error occurred. Please wait a bit and try again.",
  SERVER_ERROR_DEADLINE_EXCEEDED:
    "We're sorry, a server error occurred: DEADLINE_EXCEEDED",
  AUTHORIZATION_REQUIRED:
    'Authorization is required to perform that action. Please run the script again to authorize it.',
  SERVER_ERROR_PERMISSION_DENIED:
    "We're sorry, a server error occurred while reading from storage. Error code PERMISSION_DENIED.",
  EMPTY_RESPONSE: 'Empty response',
  BAD_VALUE: 'Bad value',
  LIMIT_EXCEEDED: 'Limit Exceeded: .',
  USER_RATE_LIMIT_EXCEEDED: 'User Rate Limit Exceeded',
  RATE_LIMIT_EXCEEDED: 'Rate Limit Exceeded',
  NOT_FOUND: 'Not Found',
  BAD_REQUEST: 'Bad Request',
  BACKEND_ERROR: 'Backend Error',
  UNABLE_TO_TALK_TO_TRIGGER_SERVICE: 'Unable to talk to trigger service',
  ACTION_NOT_ALLOWED_THROUGH_EXEC_API:
    'Script has attempted to perform an action that is not allowed when invoked through the Google Apps Script Execution API.',
  TOO_MANY_LOCK_OPERATIONS:
    'There are too many LockService operations against the same script.',
  TOO_MANY_TRIGGERS_FOR_THIS_USER_ON_THE_PROJECT:
    'This script has too many triggers. Triggers must be deleted from the script before more can be added.',

  // Partial match error
  INVALID_EMAIL: 'Invalid email',
  DOCUMENT_MISSING: 'Document is missing (perhaps it was deleted?)',
  USER_RATE_LIMIT_EXCEEDED_RETRY_AFTER_SPECIFIED_TIME:
    'User-rate limit exceeded. Retry after specified time.',
  DAILY_LIMIT_EXCEEDED: 'Daily Limit Exceeded',
  SERVICE_INVOKED_TOO_MANY_TIMES_FOR_ONE_DAY:
    'Service invoked too many times for one day.',
  SERVICE_UNAVAILABLE: 'Service unavailable',
  SERVICE_ERROR: 'Service error',
  INVALID_ARGUMENT: 'Invalid argument',
  SHEET_ALREADY_EXISTS_PLEASE_ENTER_ANOTHER_NAME:
    'A sheet with this name already exists. Please enter another name.',
};

/**
 * List all error for which retrying will not make the call succeed
 */
NORETRY_ERRORS = {};
NORETRY_ERRORS[NORMALIZED_ERRORS.INVALID_EMAIL] = true;
NORETRY_ERRORS[NORMALIZED_ERRORS.MAIL_SERVICE_NOT_ENABLED] = true;
NORETRY_ERRORS[NORMALIZED_ERRORS.GMAIL_NOT_DEFINED] = true;
NORETRY_ERRORS[NORMALIZED_ERRORS.NO_RECIPIENT] = true;
NORETRY_ERRORS[
  NORMALIZED_ERRORS.LIMIT_EXCEEDED_MAX_RECIPIENTS_PER_MESSAGE
] = true;
NORETRY_ERRORS[NORMALIZED_ERRORS.LIMIT_EXCEEDED_EMAIL_BODY_SIZE] = true;
NORETRY_ERRORS[
  NORMALIZED_ERRORS.LIMIT_EXCEEDED_EMAIL_TOTAL_ATTACHMENTS_SIZE
] = true;
NORETRY_ERRORS[NORMALIZED_ERRORS.LIMIT_EXCEEDED_EMAIL_SUBJECT_LENGTH] = true;
NORETRY_ERRORS[NORMALIZED_ERRORS.NOT_FOUND] = true;
NORETRY_ERRORS[NORMALIZED_ERRORS.BAD_REQUEST] = true;
NORETRY_ERRORS[
  NORMALIZED_ERRORS.SERVICE_INVOKED_TOO_MANY_TIMES_FOR_ONE_DAY
] = true;
NORETRY_ERRORS[NORMALIZED_ERRORS.IMAP_FEATURES_DISABLED_BY_ADMIN] = true;
NORETRY_ERRORS[NORMALIZED_ERRORS.LABEL_NAME_EXISTS_OR_CONFLICTS] = true;

NORETRY_ERRORS[
  NORMALIZED_ERRORS.NO_PERMISSION_TO_ACCESS_THE_REQUESTED_DOCUMENT
] = true;
NORETRY_ERRORS[
  NORMALIZED_ERRORS.ACTION_REQUIRES_SHARED_DRIVE_MEMBERSHIP
] = true;

NORETRY_ERRORS[NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET] = true;
NORETRY_ERRORS[NORMALIZED_ERRORS.TRYING_TO_EDIT_PROTECTED_CELL] = true;
NORETRY_ERRORS[NORMALIZED_ERRORS.SHEET_NOT_FOUND] = true;
NORETRY_ERRORS[NORMALIZED_ERRORS.RANGE_NOT_FOUND] = true;
NORETRY_ERRORS[
  NORMALIZED_ERRORS.RANGE_COORDINATES_ARE_OUTSIDE_SHEET_DIMENSIONS
] = true;
NORETRY_ERRORS[NORMALIZED_ERRORS.RANGE_COORDINATES_INVALID] = true;
NORETRY_ERRORS[
  NORMALIZED_ERRORS.SHEET_ALREADY_EXISTS_PLEASE_ENTER_ANOTHER_NAME
] = true;

NORETRY_ERRORS[NORMALIZED_ERRORS.CALENDAR_SERVICE_NOT_ENABLED] = true;

NORETRY_ERRORS[NORMALIZED_ERRORS.AUTHORIZATION_REQUIRED] = true;
NORETRY_ERRORS[NORMALIZED_ERRORS.INVALID_ARGUMENT] = true;
NORETRY_ERRORS[NORMALIZED_ERRORS.ACTION_NOT_ALLOWED_THROUGH_EXEC_API] = true;
NORETRY_ERRORS[NORMALIZED_ERRORS.DAILY_LIMIT_EXCEEDED] = true;

// noinspection JSUnusedGlobalSymbols, ThisExpressionReferencesGlobalObjectJS
this['ErrorHandler'] = {
  // Add local alias to run the library as normal code
  expBackoff: expBackoff,
  urlFetchWithExpBackOff: urlFetchWithExpBackOff,
  logError: logError,

  getNormalizedError: getNormalizedError,
  getErrorLocale: getErrorLocale,
  NORMALIZED_ERRORS: NORMALIZED_ERRORS,
  NORETRY_ERRORS: NORETRY_ERRORS,
};

//<editor-fold desc="# Private methods">

var ErrorHandler_ = {};

// noinspection ThisExpressionReferencesGlobalObjectJS
/**
 * Get GAS global object: top-level this
 */
ErrorHandler_._this = this;

/**
 * Format stack:
 * "at File Name:lineNumber (myFunction)" => "at myFunction(File Name:lineNumber)"
 *
 * @param {string} stack - Stack given by GAS with console.stack
 * @param {string} [addonName] - Optional Add-on name added by GAS to the stacks: will remove it from output stack
 *
 * @return {{
 *   stack: string,
 *   lastFunctionName: string
 * }} - formatted stack and last functionName executed
 */
ErrorHandler_._convertErrorStack = function (stack, addonName) {
  const formattedStack = [];
  let lastFunctionName = '';
  let res;
  const regex = new RegExp(
    'at\\s([^:]+?)' +
      (addonName ? '(?:\\s\\(' + addonName + '\\))?' : '') +
      ':(\\d+)(?:\\s\\(([^)]+)\\))?',
    'gm'
  );

  while ((res = regex.exec(stack))) {
    const [, /* total match */ fileName, lineNumber, functionName] = res;

    if (!lastFunctionName) lastFunctionName = functionName || '';

    formattedStack.push(
      'at ' +
        (functionName || '[unknown function]') +
        '(' +
        fileName +
        ':' +
        lineNumber +
        ')'
    );
  }

  return {
    stack: formattedStack.join('\n    '),
    lastFunctionName: lastFunctionName,
  };
};

// noinspection NonAsciiCharacters, JSNonASCIINames
/**
 * Map all different error translation to their english counterpart,
 * Thanks to Google AppsScript throwing localized errors, it's impossible to easily catch them and actually do something to fix it for our users.
 * ISO-639-1 Codes: https://cloud.google.com/translate/docs/languages
 *
 * @type {Object<ErrorHandler_.ErrorMatcher>}
 */
ErrorHandler_._ERROR_MESSAGE_TRANSLATIONS = {
  // "Conditional format rule cannot reference a different sheet."
  'Conditional format rule cannot reference a different sheet.': {
    ref: NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET,
    locale: 'en',
  },
  'Quy t???c ?????nh d???ng c?? ??i???u ki???n kh??ng th??? tham chi???u m???t trang t??nh kh??c.': {
    ref: NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET,
    locale: 'vi',
  },
  'La regla de formato condicional no puede hacer referencia a una hoja diferente.': {
    ref: NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET,
    locale: 'es',
  },
  'La regola di formattazione condizionale non pu?? contenere un riferimento a un altro foglio.': {
    ref: NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET,
    locale: 'it',
  },
  'La r??gle de mise en forme conditionnelle ne doit pas faire r??f??rence ?? une autre feuille.': {
    ref: NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET,
    locale: 'fr',
  },
  'Une r??gle de mise en forme conditionnelle ne peut pas faire r??f??rence ?? une autre feuille.': {
    ref: NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET,
    locale: 'fr_ca',
  },
  'Die Regel f??r eine bedingte Formatierung darf sich nicht auf ein anderes Tabellenblatt beziehen.': {
    ref: NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET,
    locale: 'de',
  },
  '?????????????? ?????????????????? ???????????????????????????? ???? ?????????? ?????????????????? ???? ???????????? ????????.': {
    ref: NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET,
    locale: 'ru',
  },
  '????????? ?????? ????????? ?????? ????????? ????????? ??? ????????????.': {
    ref: NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET,
    locale: 'ko',
  },
  '???????????????????????????????????????????????????': {
    ref: NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET,
    locale: 'zh_tw',
  },
  '????????????????????????????????????????????????': {
    ref: NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET,
    locale: 'zh_cn',
  },
  '????????????????????????????????????????????????': {
    ref: NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET,
    locale: 'zh_hk',
  },
  '???????????????????????????????????????????????????????????????????????????????????????': {
    ref: NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET,
    locale: 'ja',
  },
  'Pravidlo podm??n??n??ho form??tu nem????e odkazovat na jin?? list.': {
    ref: NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET,
    locale: 'cs',
  },
  'Nosac??jumform??ta k??rtulai nevar b??t atsauce uz citu lapu.': {
    ref: NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET,
    locale: 'lv',
  },
  'Pravidlo podmienen??ho form??tovania nem????e odkazova?? na in?? h??rok.': {
    ref: NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET,
    locale: 'sk',
  },
  'Conditionele opmaakregel kan niet verwijzen naar een ander blad.': {
    ref: NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET,
    locale: 'nl',
  },
  'Ehdollinen muotoilus????nt?? ei voi viitata toiseen taulukkoon.': {
    ref: NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET,
    locale: 'fi',
  },
  ???????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????: {
    ref: NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET,
    locale: 'th',
  },
  'Regu??a formatowania warunkowego nie mo??e odwo??ywa?? si?? do innego arkusza.': {
    ref: NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET,
    locale: 'pl',
  },
  'Aturan format bersyarat tidak dapat merujuk ke sheet yang berbeda.': {
    ref: NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET,
    locale: 'in',
  },
  'Villkorsstyrd formateringsregel f??r inte referera till ett annat arbetsblad.': {
    ref: NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET,
    locale: 'sv',
  },
  'La regla de format condicional no pot fer refer??ncia a un altre full.': {
    ref: NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET,
    locale: 'ca',
  },
  'A felt??teles form??z??si szab??ly nem tud m??sik munkalapot megh??vni.': {
    ref: NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET,
    locale: 'hu',
  },
  'A regra de formata????o condicional n??o pode fazer refer??ncia a uma p??gina diferente.': {
    ref: NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET,
    locale: 'pt',
  },
  '?????????????? ???????????????? ???????????????????????? ???? ???????? ???????????????????? ???? ?????????? ??????????.': {
    ref: NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET,
    locale: 'uk',
  },
  '???? ???????? ???? ???????? ???????????? ?????????????? ?????? ???????? ????????????.': {
    ref: NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET,
    locale: 'ar_sa',
  },
  '?? ?????????????? ???????????? ?????? ???????????????? ?????? ???????????? ???? ???????????????????? ???? ?????????????????????? ??????????.': {
    ref: NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET,
    locale: 'el',
  },
  'En betinget formateringsregel kan ikke referere til et annet ark.': {
    ref: NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET,
    locale: 'no',
  },
  'Ko??ullu bi??imlendirme kural?? farkl?? bir sayfaya ba??vuramaz.': {
    ref: NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET,
    locale: 'tr',
  },
  'Pravilo pogojnega oblikovanja se ne more sklicevati na drug list.': {
    ref: NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET,
    locale: 'sl',
  },
  'Hindi maaaring mag-reference ng ibang sheet ang conditional format rule.': {
    ref: NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET,
    locale: 'fil',
  },
  'En betinget formatregel kan ikke henvise til et andet ark.': {
    ref: NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET,
    locale: 'da',
  },
  '?????? ???? ?????????? ?????????? ???? ???????? ?????????? ?????????? ?????????????? ??????.': {
    ref: NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET,
    locale: 'iw',
  },
  'Formatu baldintzatuaren arauak ezin dio egin erreferentzia beste orri bati.': {
    ref: NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET,
    locale: 'eu',
  },
  'S??lyginio formato taisykl?? negali nurodyti kito lapo.': {
    ref: NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET,
    locale: 'lt',
  },
  'Regula cu format condi??ionat nu poate face referire la alt?? foaie.': {
    ref: NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET,
    locale: 'ro',
  },
  'Tingimusvormingu reegel ei saa viidata teisele lehele.': {
    ref: NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET,
    locale: 'et',
  },
  '?????????????? ???? ?????????????? ???????????????????? ???? ???????? ???? ?????????????? ???? ?????????? ????????????.': {
    ref: NORMALIZED_ERRORS.CONDITIONNAL_RULE_REFERENCE_DIF_SHEET,
    locale: 'sr',
  },

  // "We're sorry, a server error occurred. Please wait a bit and try again."
  "We're sorry, a server error occurred. Please wait a bit and try again.": {
    ref: NORMALIZED_ERRORS.SERVER_ERROR_RETRY_LATER,
    locale: 'en',
  },
  'Spiacenti. Si ?? verificato un errore del server. Attendi e riprova.': {
    ref: NORMALIZED_ERRORS.SERVER_ERROR_RETRY_LATER,
    locale: 'it',
  },
  'Une erreur est survenue sur le serveur. Nous vous prions de nous en excuser et vous invitons ?? r??essayer ult??rieurement.': {
    ref: NORMALIZED_ERRORS.SERVER_ERROR_RETRY_LATER,
    locale: 'fr',
  },
  'Xin l???i b???n, ma??y chu?? ???? g???p l???i. Vui lo??ng ch???? m???t l??t v?? th??? l???i.': {
    ref: NORMALIZED_ERRORS.SERVER_ERROR_RETRY_LATER,
    locale: 'vi',
  },
  'Lo sentimos, se ha producido un error en el servidor. Espera un momento y vuelve a intentarlo.': {
    ref: NORMALIZED_ERRORS.SERVER_ERROR_RETRY_LATER,
    locale: 'es',
  },
  'Lo sentimos, se produjo un error en el servidor. Aguarde un momento e int??ntelo de nuevo.': {
    ref: NORMALIZED_ERRORS.SERVER_ERROR_RETRY_LATER,
    locale: 'es_419',
  },
  '?????????????????? ?????????????????????????????????????????????????????????????????????????????????????????????????????? ????????????????????????????????????????????????????????????????????????????????????': {
    ref: NORMALIZED_ERRORS.SERVER_ERROR_RETRY_LATER,
    locale: 'th',
  },
  '??????????????????????????????????????????????????????': {
    ref: NORMALIZED_ERRORS.SERVER_ERROR_RETRY_LATER,
    locale: 'zh_tw',
  },
  'Infelizmente ocorreu um erro do servidor. Espere um momento e tente novamente.': {
    ref: NORMALIZED_ERRORS.SERVER_ERROR_RETRY_LATER,
    locale: 'pt',
  },
  'Sajn??ljuk, szerverhiba t??rt??nt. K??rj??k, v??rjon egy kicsit, majd pr??b??lkozzon ??jra.': {
    ref: NORMALIZED_ERRORS.SERVER_ERROR_RETRY_LATER,
    locale: 'hu',
  },
  'Ett serverfel uppstod. V??nta lite och f??rs??k igen.': {
    ref: NORMALIZED_ERRORS.SERVER_ERROR_RETRY_LATER,
    locale: 'sv',
  },
  'A ap??rut o eroare de server. A??tepta??i pu??in ??i ??ncerca??i din nou.': {
    ref: NORMALIZED_ERRORS.SERVER_ERROR_RETRY_LATER,
    locale: 'ro',
  },
  'Ein Serverfehler ist aufgetreten. Bitte versuchen Sie es sp??ter erneut.': {
    ref: NORMALIZED_ERRORS.SERVER_ERROR_RETRY_LATER,
    locale: 'de',
  },

  // "We're sorry, a server error occurred: DEADLINE_EXCEEDED"
  "We're sorry, a server error occurred: DEADLINE_EXCEEDED": {
    ref: NORMALIZED_ERRORS.SERVER_ERROR_DEADLINE_EXCEEDED,
    locale: 'en',
  },
  'S-a ??nregistrat o eroare de server: DEADLINE_EXCEEDED': {
    ref: NORMALIZED_ERRORS.SERVER_ERROR_DEADLINE_EXCEEDED,
    locale: 'ro',
  },
  '???????????? ?????? ?????? ???? ????????????: DEADLINE_EXCEEDED': {
    ref: NORMALIZED_ERRORS.SERVER_ERROR_DEADLINE_EXCEEDED,
    locale: 'ar',
  },
  'Vi beklager, det oppstod en tjenerfeil: DEADLINE_EXCEEDED': {
    ref: NORMALIZED_ERRORS.SERVER_ERROR_DEADLINE_EXCEEDED,
    locale: 'no',
  },
  '?? ??????????????????, ?????????????????? ???????????? ??????????????: DEADLINE_EXCEEDED': {
    ref: NORMALIZED_ERRORS.SERVER_ERROR_DEADLINE_EXCEEDED,
    locale: 'ru',
  },
  'Spiacenti, si ?? verificato un errore del server: DEADLINE_EXCEEDED': {
    ref: NORMALIZED_ERRORS.SERVER_ERROR_DEADLINE_EXCEEDED,
    locale: 'it',
  },
  '??????????????, ?????????? ?????????? ??????: DEADLINE_EXCEEDED': {
    ref: NORMALIZED_ERRORS.SERVER_ERROR_DEADLINE_EXCEEDED,
    locale: 'he',
  },
  'Tyv??rr uppstod ett serverfel: DEADLINE_EXCEEDED': {
    ref: NORMALIZED_ERRORS.SERVER_ERROR_DEADLINE_EXCEEDED,
    locale: 'sv',
  },
  '?????????????????? ????????????????????????????????????????????????????????????????????????????????????: DEADLINE_EXCEEDED': {
    ref: NORMALIZED_ERRORS.SERVER_ERROR_DEADLINE_EXCEEDED,
    locale: 'th',
  },
  'Sajn??ljuk, szerverhiba t??rt??nt: DEADLINE_EXCEEDED': {
    ref: NORMALIZED_ERRORS.SERVER_ERROR_DEADLINE_EXCEEDED,
    locale: 'hu',
  },
  'Se ha producido un error en el servidor: DEADLINE_EXCEEDED.': {
    ref: NORMALIZED_ERRORS.SERVER_ERROR_DEADLINE_EXCEEDED,
    locale: 'es',
  },
  'Vabandame, serveris ilmnes viga: DEADLINE_EXCEEDED.': {
    ref: NORMALIZED_ERRORS.SERVER_ERROR_DEADLINE_EXCEEDED,
    locale: 'et',
  },
  "Une erreur s'est produite sur le serveur : DEADLINE_EXCEEDED": {
    ref: NORMALIZED_ERRORS.SERVER_ERROR_DEADLINE_EXCEEDED,
    locale: 'fr',
  },
  'Xin l???i b???n, ma??y chu?? ???? g???p l???i: DEADLINE_EXCEEDED': {
    ref: NORMALIZED_ERRORS.SERVER_ERROR_DEADLINE_EXCEEDED,
    locale: 'vi',
  },
  'Maaf, terjadi kesalahan pada server: DEADLINE_EXCEEDED': {
    ref: NORMALIZED_ERRORS.SERVER_ERROR_DEADLINE_EXCEEDED,
    locale: 'id',
  },
  'Onze excuses. Er is een serverfout opgetreden: DEADLINE_EXCEEDED': {
    ref: NORMALIZED_ERRORS.SERVER_ERROR_DEADLINE_EXCEEDED,
    locale: 'nl',
  },

  // "Authorization is required to perform that action. Please run the script again to authorize it."
  'Authorization is required to perform that action. Please run the script again to authorize it.': {
    ref: NORMALIZED_ERRORS.AUTHORIZATION_REQUIRED,
    locale: 'en',
  },
  'Autorisation requise pour ex??cuter cette action. Ex??cutez ?? nouveau le script pour autoriser cette action.': {
    ref: NORMALIZED_ERRORS.AUTHORIZATION_REQUIRED,
    locale: 'fr',
  },
  'C???n ???????c cho ph??p ????? th???c hi???n t??c v??? ????. H??y ch???y l???i t???p l???nh ????? cho ph??p t??c v???.': {
    ref: NORMALIZED_ERRORS.AUTHORIZATION_REQUIRED,
    locale: 'vi',
  },
  '?? necess??ria autoriza????o para executar esta a????o. Execute o script novamente para autorizar a a????o.': {
    ref: NORMALIZED_ERRORS.AUTHORIZATION_REQUIRED,
    locale: 'pt',
  },

  // "Authorization is required to perform that action." >> Multiple-account issue / V8 - default to NORMALIZED_ERRORS.AUTHORIZATION_REQUIRED
  'Authorisation is required to perform that action.': {
    ref: NORMALIZED_ERRORS.AUTHORIZATION_REQUIRED,
    locale: 'en-GB',
  },
  'Authorization is required to perform that action.': {
    ref: NORMALIZED_ERRORS.AUTHORIZATION_REQUIRED,
    locale: 'en-US',
  },
  'Vous devez disposer des autorisations requises pour pouvoir effectuer cette action.': {
    ref: NORMALIZED_ERRORS.AUTHORIZATION_REQUIRED,
    locale: 'fr',
  },
  'Se necesita autorizaci??n para realizar esta acci??n.': {
    ref: NORMALIZED_ERRORS.AUTHORIZATION_REQUIRED,
    locale: 'es',
  },
  'C???n ???????c cho ph??p ????? th???c hi???n h??nh ?????ng ????.': {
    ref: NORMALIZED_ERRORS.AUTHORIZATION_REQUIRED,
    locale: 'vi',
  },
  '?? necess??ria autoriza????o para efetuar esta a????o.': {
    ref: NORMALIZED_ERRORS.AUTHORIZATION_REQUIRED,
    locale: 'pt',
  },
  "Per eseguire questa azione ?? richiesta l'autorizzazione.": {
    ref: NORMALIZED_ERRORS.AUTHORIZATION_REQUIRED,
    locale: 'it',
  },
  'Godk??nnande kr??vs f??r att utf??ra denna ??tg??rd.': {
    ref: NORMALIZED_ERRORS.AUTHORIZATION_REQUIRED,
    locale: 'sv',
  },

  // "We're sorry, a server error occurred while reading from storage. Error code PERMISSION_DENIED."
  "We're sorry, a server error occurred while reading from storage. Error code PERMISSION_DENIED.": {
    ref: NORMALIZED_ERRORS.SERVER_ERROR_PERMISSION_DENIED,
    locale: 'en',
  },

  // "Empty response"
  'Empty response': {ref: NORMALIZED_ERRORS.EMPTY_RESPONSE, locale: 'en'},
  'Respuesta vac??a': {ref: NORMALIZED_ERRORS.EMPTY_RESPONSE, locale: 'es'},
  'R??ponse vierge': {ref: NORMALIZED_ERRORS.EMPTY_RESPONSE, locale: 'fr'},
  'C??u tr??? l???i tr???ng': {ref: NORMALIZED_ERRORS.EMPTY_RESPONSE, locale: 'vi'},
  'Resposta vazia': {ref: NORMALIZED_ERRORS.EMPTY_RESPONSE, locale: 'pt'},
  'Pr??zdn?? odpov????': {ref: NORMALIZED_ERRORS.EMPTY_RESPONSE, locale: 'cs'},
  'R??spuns gol': {ref: NORMALIZED_ERRORS.EMPTY_RESPONSE, locale: 'ro_MD'},

  // "Bad value"
  'Bad value': {ref: NORMALIZED_ERRORS.BAD_VALUE, locale: 'en'},
  'Helytelen ??rt??k': {ref: NORMALIZED_ERRORS.BAD_VALUE, locale: 'hu'},
  'Valor incorrecto': {ref: NORMALIZED_ERRORS.BAD_VALUE, locale: 'es'},
  'Gi?? tr??? kh??ng h???p l???': {ref: NORMALIZED_ERRORS.BAD_VALUE, locale: 'vi'},
  'Valeur incorrecte': {ref: NORMALIZED_ERRORS.BAD_VALUE, locale: 'fr'},
  'Valor inv??lido': {ref: NORMALIZED_ERRORS.BAD_VALUE, locale: 'pt'},

  // "Limit Exceeded: ." - eg: Gmail App.sendEmail()
  'Limit Exceeded: .': {ref: NORMALIZED_ERRORS.LIMIT_EXCEEDED, locale: 'en'},
  'L??mite excedido: .': {ref: NORMALIZED_ERRORS.LIMIT_EXCEEDED, locale: 'es'},
  'Limite d??pass??e : .': {ref: NORMALIZED_ERRORS.LIMIT_EXCEEDED, locale: 'fr'},
  '??????????????????': {ref: NORMALIZED_ERRORS.LIMIT_EXCEEDED, locale: 'zh_TW'},

  // "Limit Exceeded: Email Recipients Per Message." - eg: Gmail App.sendEmail()
  'Limit Exceeded: Email Recipients Per Message.': {
    ref: NORMALIZED_ERRORS.LIMIT_EXCEEDED_MAX_RECIPIENTS_PER_MESSAGE,
    locale: 'en',
  },
  'S??n??r A????ld??: ??leti Ba????na E-posta Al??c??s??.': {
    ref: NORMALIZED_ERRORS.LIMIT_EXCEEDED_MAX_RECIPIENTS_PER_MESSAGE,
    locale: 'tr',
  },
  '???? v?????t qu?? gi???i h???n: Ng?????i nh???n email tr??n m???i th??.': {
    ref: NORMALIZED_ERRORS.LIMIT_EXCEEDED_MAX_RECIPIENTS_PER_MESSAGE,
    locale: 'vi',
  },
  'L??mite excedido: Destinatarios de correo electr??nico por mensaje.': {
    ref: NORMALIZED_ERRORS.LIMIT_EXCEEDED_MAX_RECIPIENTS_PER_MESSAGE,
    locale: 'es',
  },

  // "Limit Exceeded: Email Body Size." - eg: Gmail App.sendEmail()
  'Limit Exceeded: Email Body Size.': {
    ref: NORMALIZED_ERRORS.LIMIT_EXCEEDED_EMAIL_BODY_SIZE,
    locale: 'en',
  },
  'L??mite Excedido: Tama??o del cuerpo del mensaje.': {
    ref: NORMALIZED_ERRORS.LIMIT_EXCEEDED_EMAIL_BODY_SIZE,
    locale: 'es_PE',
  },

  // "Limit Exceeded: Email Total Attachments Size." - eg: Gmail App.sendEmail()
  'Limit Exceeded: Email Total Attachments Size.': {
    ref: NORMALIZED_ERRORS.LIMIT_EXCEEDED_EMAIL_TOTAL_ATTACHMENTS_SIZE,
    locale: 'en',
  },
  'L??mite excedido: Tama??o total de los archivos adjuntos del correo electr??nico.': {
    ref: NORMALIZED_ERRORS.LIMIT_EXCEEDED_EMAIL_TOTAL_ATTACHMENTS_SIZE,
    locale: 'es',
  },

  // "Argument too large: subject" - eg: Gmail App.sendEmail()
  'Argument too large: subject': {
    ref: NORMALIZED_ERRORS.LIMIT_EXCEEDED_EMAIL_SUBJECT_LENGTH,
    locale: 'en',
  },
  'Argument trop grand : subject': {
    ref: NORMALIZED_ERRORS.LIMIT_EXCEEDED_EMAIL_SUBJECT_LENGTH,
    locale: 'fr',
  },
  'Argumento demasiado grande: subject': {
    ref: NORMALIZED_ERRORS.LIMIT_EXCEEDED_EMAIL_SUBJECT_LENGTH,
    locale: 'es',
  },
  'Argumen terlalu besar: subject': {
    ref: NORMALIZED_ERRORS.LIMIT_EXCEEDED_EMAIL_SUBJECT_LENGTH,
    locale: 'id',
  },

  // "User Rate Limit Exceeded" - eg: Gmail.Users.Threads.get
  'User Rate Limit Exceeded': {
    ref: NORMALIZED_ERRORS.USER_RATE_LIMIT_EXCEEDED,
    locale: 'en',
  },

  // "Rate Limit Exceeded" - eg: Gmail.Users.Messages.send
  'Rate Limit Exceeded': {
    ref: NORMALIZED_ERRORS.RATE_LIMIT_EXCEEDED,
    locale: 'en',
  },

  // "Not Found"
  // with uppercase "f" when calling Gmail.Users.Messages or Gmail.Users.Drafts endpoints
  'Not Found': {ref: NORMALIZED_ERRORS.NOT_FOUND, locale: 'en'},
  // with lowercase "f" when calling Gmail.Users.Threads endpoint
  'Not found': {ref: NORMALIZED_ERRORS.NOT_FOUND, locale: 'en'},
  'N??o encontrado': {ref: NORMALIZED_ERRORS.NOT_FOUND, locale: 'pt_PT'},
  'No se ha encontrado.': {ref: NORMALIZED_ERRORS.NOT_FOUND, locale: 'es'},
  'Non trovato': {ref: NORMALIZED_ERRORS.NOT_FOUND, locale: 'it'},
  Introuvable: {ref: NORMALIZED_ERRORS.NOT_FOUND, locale: 'fr'},

  // "Bad Request" - eg: all 'list' requests from Gmail advanced service, maybe if there are 0 messages in Gmail (new account)
  'Bad Request': {ref: NORMALIZED_ERRORS.BAD_REQUEST, locale: 'en'},

  // "Backend Error"
  'Backend Error': {ref: NORMALIZED_ERRORS.BACKEND_ERROR, locale: 'en'},

  // "You are trying to edit a protected cell or object. Please contact the spreadsheet owner to remove protection if you need to edit."
  'You are trying to edit a protected cell or object. Please contact the spreadsheet owner to remove protection if you need to edit.': {
    ref: NORMALIZED_ERRORS.TRYING_TO_EDIT_PROTECTED_CELL,
    locale: 'en',
  },
  '????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????': {
    ref: NORMALIZED_ERRORS.TRYING_TO_EDIT_PROTECTED_CELL,
    locale: 'ja',
  },
  'Est??s intentando editar una celda o un objeto protegidos. Ponte en contacto con el propietario de la hoja de c??lculo para desprotegerla si es necesario modificarla.': {
    ref: NORMALIZED_ERRORS.TRYING_TO_EDIT_PROTECTED_CELL,
    locale: 'es',
  },
  "Vous tentez de modifier une cellule ou un objet prot??g??s. Si vous avez besoin d'effectuer cette modification, demandez au propri??taire de la feuille de calcul de supprimer la protection.": {
    ref: NORMALIZED_ERRORS.TRYING_TO_EDIT_PROTECTED_CELL,
    locale: 'fr',
  },
  '?????? ?????????????? ????????????????. ?????????? ???????????????? ????, ???????????????????? ?? ?????????????????? ??????????????.': {
    ref: NORMALIZED_ERRORS.TRYING_TO_EDIT_PROTECTED_CELL,
    locale: 'ru',
  },
  'Est??s intentando modificar una celda o un objeto protegido. Si necesitas realizar cambios, comun??cate con el propietario de la hoja de c??lculo para que quite la protecci??n.': {
    ref: NORMALIZED_ERRORS.TRYING_TO_EDIT_PROTECTED_CELL,
    locale: 'es_MX',
  },
  'Voc?? est?? tentando editar uma c??lula ou um objeto protegido. Se precisar editar, entre em contato com o propriet??rio da planilha para remover a prote????o.': {
    ref: NORMALIZED_ERRORS.TRYING_TO_EDIT_PROTECTED_CELL,
    locale: 'pt',
  },
  '???????????????????? ???? ???????????????? ?????????????????? ???????????? ?????? ??????????????. ?????????????????????????? ???????????????? ???????????? ???? ???????????? ?????????????? ?????? ?????????? ???? ?????????????? ????????????.': {
    ref: NORMALIZED_ERRORS.TRYING_TO_EDIT_PROTECTED_CELL,
    locale: 'sr',
  },

  // "Sheet not found"
  'Sheet not found': {ref: NORMALIZED_ERRORS.SHEET_NOT_FOUND, locale: 'en'},

  // "Range not found" - eg: Range.getValue()
  'Range not found': {ref: NORMALIZED_ERRORS.RANGE_NOT_FOUND, locale: 'en'},
  'Range  not found': {ref: NORMALIZED_ERRORS.RANGE_NOT_FOUND, locale: 'en_GB'},
  'No se ha encontrado el intervalo.': {
    ref: NORMALIZED_ERRORS.RANGE_NOT_FOUND,
    locale: 'es',
  },
  'Intervalo n??o encontrado': {
    ref: NORMALIZED_ERRORS.RANGE_NOT_FOUND,
    locale: 'pt',
  },
  'Kh??ng t??m th???y d???i ??': {
    ref: NORMALIZED_ERRORS.RANGE_NOT_FOUND,
    locale: 'vi',
  },
  'Plage introuvable': {ref: NORMALIZED_ERRORS.RANGE_NOT_FOUND, locale: 'fr'},
  'Vahemikku ei leitud': {ref: NORMALIZED_ERRORS.RANGE_NOT_FOUND, locale: 'et'},

  // "The coordinates of the range are outside the dimensions of the sheet."
  'The coordinates of the range are outside the dimensions of the sheet.': {
    ref: NORMALIZED_ERRORS.RANGE_COORDINATES_ARE_OUTSIDE_SHEET_DIMENSIONS,
    locale: 'en',
  },
  'As coordenadas do intervalo est??o fora das dimens??es da p??gina.': {
    ref: NORMALIZED_ERRORS.RANGE_COORDINATES_ARE_OUTSIDE_SHEET_DIMENSIONS,
    locale: 'pt',
  },
  'To??a ?????? cu??a da??i ?? n????m ngoa??i ki??ch th??????c cu??a trang ti??nh.': {
    ref: NORMALIZED_ERRORS.RANGE_COORDINATES_ARE_OUTSIDE_SHEET_DIMENSIONS,
    locale: 'vi',
  },

  // "The coordinates or dimensions of the range are invalid."
  'The coordinates or dimensions of the range are invalid.': {
    ref: NORMALIZED_ERRORS.RANGE_COORDINATES_INVALID,
    locale: 'en',
  },

  // "No item with the given ID could be found, or you do not have permission to access it." - eg:Drive App.getFileById
  'No item with the given ID could be found, or you do not have permission to access it.': {
    ref: NORMALIZED_ERRORS.NO_ITEM_WITH_GIVEN_ID_COULD_BE_FOUND,
    locale: 'en',
  },
  'Kh??ng t??m th???y m???c n??o c?? ID ???? cung c???p ho???c b???n kh??ng c?? quy???n truy c???p v??o m???c ????.': {
    ref: NORMALIZED_ERRORS.NO_ITEM_WITH_GIVEN_ID_COULD_BE_FOUND,
    locale: 'vi',
  },
  'No se ha encontrado ning??n elemento con el ID proporcionado o no tienes permiso para acceder a ??l.': {
    ref: NORMALIZED_ERRORS.NO_ITEM_WITH_GIVEN_ID_COULD_BE_FOUND,
    locale: 'es',
  },
  'No se ha encontrado ning??n elemento con la ID proporcionada o no tienes permiso para acceder a ??l.': {
    ref: NORMALIZED_ERRORS.NO_ITEM_WITH_GIVEN_ID_COULD_BE_FOUND,
    locale: 'es_419',
  },
  "Nessun elemento trovato con l'ID specificato o non disponi di autorizzazioni per accedervi.": {
    ref: NORMALIZED_ERRORS.NO_ITEM_WITH_GIVEN_ID_COULD_BE_FOUND,
    locale: 'it',
  },
  'Det gick inte att hitta n??gon post med angivet ID eller s?? saknar du beh??righet f??r att f?? ??tkomst till den.': {
    ref: NORMALIZED_ERRORS.NO_ITEM_WITH_GIVEN_ID_COULD_BE_FOUND,
    locale: 'sv',
  },
  'Er is geen item met de opgegeven id gevonden of je hebt geen toestemming om het item te openen.': {
    ref: NORMALIZED_ERRORS.NO_ITEM_WITH_GIVEN_ID_COULD_BE_FOUND,
    locale: 'nl',
  },
  'Nenhum item com o ID fornecido foi encontrado ou voc?? n??o tem permiss??o para acess??-lo.': {
    ref: NORMALIZED_ERRORS.NO_ITEM_WITH_GIVEN_ID_COULD_BE_FOUND,
    locale: 'pt',
  },
  "Impossible de trouver l'??l??ment correspondant ?? cet identifiant. Vous n'??tes peut-??tre pas autoris?? ?? y acc??der.": {
    ref: NORMALIZED_ERRORS.NO_ITEM_WITH_GIVEN_ID_COULD_BE_FOUND,
    locale: 'fr',
  },
  "No s'ha trobat cap element amb aquest identificador o no teniu perm??s per accedir-hi.": {
    ref: NORMALIZED_ERRORS.NO_ITEM_WITH_GIVEN_ID_COULD_BE_FOUND,
    locale: 'ca',
  },
  '?????????????? ?? ???????????????? ?????????? ???? ???????????? ?????? ?? ?????? ?????? ???????? ?????????????? ?? ????????.': {
    ref: NORMALIZED_ERRORS.NO_ITEM_WITH_GIVEN_ID_COULD_BE_FOUND,
    locale: 'ru',
  },
  'Nebyly nalezeny ????dn?? polo??ky se zadan??m ID nebo nem??te opr??vn??n?? k nim p??istupovat.': {
    ref: NORMALIZED_ERRORS.NO_ITEM_WITH_GIVEN_ID_COULD_BE_FOUND,
    locale: 'cs',
  },
  'Item dengan ID yang diberikan tidak dapat ditemukan atau Anda tidak memiliki izin untuk mengaksesnya.': {
    ref: NORMALIZED_ERRORS.NO_ITEM_WITH_GIVEN_ID_COULD_BE_FOUND,
    locale: 'in',
  },
  '??????????????? ID ?????????????????????????????????????????????????????????????????????????????????????????????': {
    ref: NORMALIZED_ERRORS.NO_ITEM_WITH_GIVEN_ID_COULD_BE_FOUND,
    locale: 'ja',
  },
  '???? ?????????????? ???????????? ?????????????? ???? ???????????????????? ??????????????????????????????. ?????? ?? ?????? ?????????? ?????????????? ???? ???????????? ???? ??????????.': {
    ref: NORMALIZED_ERRORS.NO_ITEM_WITH_GIVEN_ID_COULD_BE_FOUND,
    locale: 'uk',
  },
  'Verilen kimli??e sahip ????e bulunamad?? veya bu ????eye eri??me iznine sahip de??ilsiniz.': {
    ref: NORMALIZED_ERRORS.NO_ITEM_WITH_GIVEN_ID_COULD_BE_FOUND,
    locale: 'tr',
  },

  // "You do not have permissions to access the requested document."
  'You do not have permissions to access the requested document.': {
    ref: NORMALIZED_ERRORS.NO_PERMISSION_TO_ACCESS_THE_REQUESTED_DOCUMENT,
    locale: 'en',
  },
  'You do not have permission to access the requested document.': {
    ref: NORMALIZED_ERRORS.NO_PERMISSION_TO_ACCESS_THE_REQUESTED_DOCUMENT,
    locale: 'en',
  },
  'B???n kh??ng c?? quy???n truy c???p t??i li???u y??u c???u.': {
    ref: NORMALIZED_ERRORS.NO_PERMISSION_TO_ACCESS_THE_REQUESTED_DOCUMENT,
    locale: 'vi',
  },
  'B???n kh??ng c?? quy???n truy c???p v??o t??i li???u y??u c???u.': {
    ref: NORMALIZED_ERRORS.NO_PERMISSION_TO_ACCESS_THE_REQUESTED_DOCUMENT,
    locale: 'vi',
  },
  'No dispones del permiso necesario para acceder al documento solicitado.': {
    ref: NORMALIZED_ERRORS.NO_PERMISSION_TO_ACCESS_THE_REQUESTED_DOCUMENT,
    locale: 'es',
  },
  "Vous n'avez pas l'autorisation d'acc??der au document demand??.": {
    ref: NORMALIZED_ERRORS.NO_PERMISSION_TO_ACCESS_THE_REQUESTED_DOCUMENT,
    locale: 'fr',
  },
  "Vous n'??tes pas autoris?? ?? acc??der au document demand??.": {
    ref: NORMALIZED_ERRORS.NO_PERMISSION_TO_ACCESS_THE_REQUESTED_DOCUMENT,
    locale: 'fr',
  },
  "Non disponi dell'autorizzazione necessaria per accedere al documento richiesto.": {
    ref: NORMALIZED_ERRORS.NO_PERMISSION_TO_ACCESS_THE_REQUESTED_DOCUMENT,
    locale: 'it',
  },
  'No cuenta con los permisos necesarios para acceder al documento solicitado.': {
    ref: NORMALIZED_ERRORS.NO_PERMISSION_TO_ACCESS_THE_REQUESTED_DOCUMENT,
    locale: 'es_CO',
  },
  'No tienes permiso para acceder al documento solicitado.': {
    ref: NORMALIZED_ERRORS.NO_PERMISSION_TO_ACCESS_THE_REQUESTED_DOCUMENT,
    locale: 'es',
  },

  // "Limit Exceeded: Drive App." - using Unicode escape sequence to avoid scope prompt
  'Limit Exceeded: Drive\u0041pp.': {
    ref: NORMALIZED_ERRORS.LIMIT_EXCEEDED_DRIVE_APP,
    locale: 'en',
  },
  'L??mite Excedido: Drive\u0041pp.': {
    ref: NORMALIZED_ERRORS.LIMIT_EXCEEDED_DRIVE_APP,
    locale: 'es_419',
  },

  // "Limit Exceeded: Drive."
  'Limit Exceeded: Drive.': {
    ref: NORMALIZED_ERRORS.LIMIT_EXCEEDED_DRIVE,
    locale: 'en',
  },
  'L??mite Excedido: Drive.': {
    ref: NORMALIZED_ERRORS.LIMIT_EXCEEDED_DRIVE,
    locale: 'es_419',
  },

  // "Unable to talk to trigger service"
  'Unable to talk to trigger service': {
    ref: NORMALIZED_ERRORS.UNABLE_TO_TALK_TO_TRIGGER_SERVICE,
    locale: 'en',
  },
  'Impossible de communiquer pour d??clencher le service': {
    ref: NORMALIZED_ERRORS.UNABLE_TO_TALK_TO_TRIGGER_SERVICE,
    locale: 'fr',
  },
  'Kh??ng th??? trao ?????i v???i ng?????i m??i gi???i ????? k??ch ho???t d???ch v???': {
    ref: NORMALIZED_ERRORS.UNABLE_TO_TALK_TO_TRIGGER_SERVICE,
    locale: 'vi',
  },
  'No es posible ponerse en contacto con el servicio de activaci??n.': {
    ref: NORMALIZED_ERRORS.UNABLE_TO_TALK_TO_TRIGGER_SERVICE,
    locale: 'es',
  },
  ???????????????????????????: {
    ref: NORMALIZED_ERRORS.UNABLE_TO_TALK_TO_TRIGGER_SERVICE,
    locale: 'zh_TW',
  },

  // "Script has attempted to perform an action that is not allowed when invoked through the Google Apps Script Execution API."
  'Script has attempted to perform an action that is not allowed when invoked through the Google Apps Script Execution API.': {
    ref: NORMALIZED_ERRORS.ACTION_NOT_ALLOWED_THROUGH_EXEC_API,
    locale: 'en',
  },

  // "Mail service not enabled"
  'Mail service not enabled': {
    ref: NORMALIZED_ERRORS.MAIL_SERVICE_NOT_ENABLED,
    locale: 'en',
  },
  'Gmail operation not allowed. : Mail service not enabled': {
    ref: NORMALIZED_ERRORS.MAIL_SERVICE_NOT_ENABLED,
    locale: 'en',
  },

  // This error happens because the Gmail advanced service was not properly loaded during this Apps Script process execution
  // In this case, we need to start a new process execution, ie restart exec from client side - no need to retry multiple times
  '"Gmail" is not defined.': {
    ref: NORMALIZED_ERRORS.GMAIL_NOT_DEFINED,
    locale: 'en',
  },

  // "Gmail operation not allowed." - eg: Gmail App.sendEmail()
  'Gmail operation not allowed.': {
    ref: NORMALIZED_ERRORS.GMAIL_OPERATION_NOT_ALLOWED,
    locale: 'en',
  },
  'Gmail operation not allowed. ': {
    ref: NORMALIZED_ERRORS.GMAIL_OPERATION_NOT_ALLOWED,
    locale: 'en',
  },
  'No se admite la operaci??n de Gmail.': {
    ref: NORMALIZED_ERRORS.GMAIL_OPERATION_NOT_ALLOWED,
    locale: 'es',
  },
  'Op??ration non autoris??e dans Gmail.': {
    ref: NORMALIZED_ERRORS.GMAIL_OPERATION_NOT_ALLOWED,
    locale: 'fr',
  },

  // "Invalid thread_id value"
  'Invalid thread_id value': {
    ref: NORMALIZED_ERRORS.INVALID_THREAD_ID_VALUE,
    locale: 'en',
  },

  // "labelId not found"
  'labelId not found': {
    ref: NORMALIZED_ERRORS.LABEL_ID_NOT_FOUND,
    locale: 'en',
  },

  // "Label name exists or conflicts"
  'Label name exists or conflicts': {
    ref: NORMALIZED_ERRORS.LABEL_NAME_EXISTS_OR_CONFLICTS,
    locale: 'en',
  },
  'Operation on Gmail Aborted. : Label name exists or conflicts': {
    ref: NORMALIZED_ERRORS.LABEL_NAME_EXISTS_OR_CONFLICTS,
    locale: 'en',
  },
  "L'op??ration sur Gmail a ??t?? annul??e. : Label name exists or conflicts": {
    ref: NORMALIZED_ERRORS.LABEL_NAME_EXISTS_OR_CONFLICTS,
    locale: 'fr',
  },

  // "Invalid label name"
  'Invalid label name': {
    ref: NORMALIZED_ERRORS.INVALID_LABEL_NAME,
    locale: 'en',
  },

  // "Invalid to header" - eg: Gmail.Users.Messages.send
  'Invalid to header': {ref: NORMALIZED_ERRORS.INVALID_EMAIL, locale: 'en'},
  // "Invalid cc header" - eg: Gmail.Users.Messages.send
  'Invalid cc header': {ref: NORMALIZED_ERRORS.INVALID_EMAIL, locale: 'en'},

  // "Failed to send email: no recipient" - eg: Gmail App.sendEmail()
  'Failed to send email: no recipient': {
    ref: NORMALIZED_ERRORS.NO_RECIPIENT,
    locale: 'en',
  },
  // "Recipient address required" - eg: Gmail.Users.Messages.send()
  'Recipient address required': {
    ref: NORMALIZED_ERRORS.NO_RECIPIENT,
    locale: 'en',
  },

  // "IMAP features disabled by administrator"
  'IMAP features disabled by administrator': {
    ref: NORMALIZED_ERRORS.IMAP_FEATURES_DISABLED_BY_ADMIN,
    locale: 'en',
  },

  // "There are too many LockService operations against the same script." - eg: Lock.tryLock()
  'There are too many LockService operations against the same script.': {
    ref: NORMALIZED_ERRORS.TOO_MANY_LOCK_OPERATIONS,
    locale: 'en',
  },
  'C?? qu?? nhi???u thao t??c LockService tr??n c??ng m???t t???p l???nh.': {
    ref: NORMALIZED_ERRORS.TOO_MANY_LOCK_OPERATIONS,
    locale: 'vi',
  },

  // "The Google Calendar is not enabled for the user." - eg: Calendar App.getDefaultCalendar()
  'The Google Calendar is not enabled for the user.': {
    ref: NORMALIZED_ERRORS.CALENDAR_SERVICE_NOT_ENABLED,
    locale: 'en',
  },

  //User Triggers limit on a project reached
  'This script has too many triggers. Triggers must be deleted from the script before more can be added.': {
    ref: NORMALIZED_ERRORS.TOO_MANY_TRIGGERS_FOR_THIS_USER_ON_THE_PROJECT,
    locale: 'en',
  },
};

/**
 * @type {Array<ErrorHandler_.PartialMatcher>}
 */
ErrorHandler_._ERROR_PARTIAL_MATCH = [
  // Invalid email: XXX
  {
    regex: /^Invalid email: (.*)$/,
    variables: ['email'],
    ref: NORMALIZED_ERRORS.INVALID_EMAIL,
    locale: 'en',
  },
  {
    regex: /^El correo electr??nico no es v??lido: (.*)$/,
    variables: ['email'],
    ref: NORMALIZED_ERRORS.INVALID_EMAIL,
    locale: 'es',
  },
  {
    regex: /^????????????????????????(.*)$/,
    variables: ['email'],
    ref: NORMALIZED_ERRORS.INVALID_EMAIL,
    locale: 'zh_TW',
  },
  {
    regex: /^E-mail incorrect : (.*)$/,
    variables: ['email'],
    ref: NORMALIZED_ERRORS.INVALID_EMAIL,
    locale: 'fr',
  },
  {
    regex: /^Email kh??ng h???p l???: (.*)$/,
    variables: ['email'],
    ref: NORMALIZED_ERRORS.INVALID_EMAIL,
    locale: 'vi',
  },
  {
    regex: /^Ongeldige e-mail: (.*)$/,
    variables: ['email'],
    ref: NORMALIZED_ERRORS.INVALID_EMAIL,
    locale: 'nl',
  },

  // Document XXX is missing (perhaps it was deleted?) - eg: Spreadsheet App.openById()
  {
    regex: /^Document (\S*) is missing \(perhaps it was deleted\?\)$/,
    variables: ['docId'],
    ref: NORMALIZED_ERRORS.DOCUMENT_MISSING,
    locale: 'en',
  },
  // not sure if escaping the backslash is needed
  {
    regex: /^Document (\S*) is missing \(perhaps it was deleted, or you don\\'t have read access\?\)$/,
    variables: ['docId'],
    ref: NORMALIZED_ERRORS.DOCUMENT_MISSING,
    locale: 'en',
  },
  {
    regex: /^Document (\S*) is missing \(perhaps it was deleted, or you don't have read access\?\)$/,
    variables: ['docId'],
    ref: NORMALIZED_ERRORS.DOCUMENT_MISSING,
    locale: 'en',
  },
  {
    regex: /^Documento (\S*) mancante \(forse ?? stato eliminato\?\)$/,
    variables: ['docId'],
    ref: NORMALIZED_ERRORS.DOCUMENT_MISSING,
    locale: 'it',
  },
  {
    regex: /^T??i li???u (\S*) b??? thi???u \(c?? th??? t??i li???u ???? b??? x??a\?\)$/,
    variables: ['docId'],
    ref: NORMALIZED_ERRORS.DOCUMENT_MISSING,
    locale: 'vi',
  },
  {
    regex: /^Falta el documento (\S*) \(puede que se haya eliminado\)\.$/,
    variables: ['docId'],
    ref: NORMALIZED_ERRORS.DOCUMENT_MISSING,
    locale: 'es',
  },
  {
    regex: /^??????????????????([^???]*)???\(??????????????????\)$/,
    variables: ['docId'],
    ref: NORMALIZED_ERRORS.DOCUMENT_MISSING,
    locale: 'zh_TW',
  },
  {
    regex: /^???????????????? (\S*) ?????????????????????? \(????????????????, ???? ?????? ????????????\)$/,
    variables: ['docId'],
    ref: NORMALIZED_ERRORS.DOCUMENT_MISSING,
    locale: 'ru',
  },
  {
    regex: /^Le document (\S*) est manquant \(peut-??tre a-t-il ??t?? supprim?? \?\)$/,
    variables: ['docId'],
    ref: NORMALIZED_ERRORS.DOCUMENT_MISSING,
    locale: 'fr',
  },
  {
    regex: /^Dokumen (\S*) hilang \(mungkin dihapus\?\)$/,
    variables: ['docId'],
    ref: NORMALIZED_ERRORS.DOCUMENT_MISSING,
    locale: 'in',
  },
  {
    regex: /^Das Dokument (\S*) fehlt\. \(Vielleicht wurde es gel??scht\?\)$/,
    variables: ['docId'],
    ref: NORMALIZED_ERRORS.DOCUMENT_MISSING,
    locale: 'de',
  },
  {
    regex: /^O documento (\S*) est?? ausente \(ser?? que foi exclu??do\?\)$/,
    variables: ['docId'],
    ref: NORMALIZED_ERRORS.DOCUMENT_MISSING,
    locale: 'pt',
  },
  {
    regex: /^Chyb?? dokument (\S*) \(je mo??n??, ??e byl smaz??n\)\.$/,
    variables: ['docId'],
    ref: NORMALIZED_ERRORS.DOCUMENT_MISSING,
    locale: 'cs',
  },
  {
    regex: /^Nema dokumenta (\S*) \(mo??da je izbrisan\?\)$/,
    variables: ['docId'],
    ref: NORMALIZED_ERRORS.DOCUMENT_MISSING,
    locale: 'hr',
  },
  {
    regex: /^A\(z\) (\S*) dokumentum hi??nyzik \(tal??n t??r??lt??k\?\)$/,
    variables: ['docId'],
    ref: NORMALIZED_ERRORS.DOCUMENT_MISSING,
    locale: 'hu',
  },

  // User-rate limit exceeded. Retry after XXX - this error can be prefixed with a translated version of 'Limit Exceeded'
  {
    regex: /User-rate limit exceeded\.\s+Retry after (.*Z)/,
    variables: ['timestamp'],
    ref: NORMALIZED_ERRORS.USER_RATE_LIMIT_EXCEEDED_RETRY_AFTER_SPECIFIED_TIME,
    locale: 'en',
  },

  // User Rate Limit Exceeded. Rate of requests for user exceed configured project quota.
  // You may consider re-evaluating expected per-user traffic to the API and adjust project quota limits accordingly.
  // You may monitor aggregate quota usage and adjust limits in the API Console: https://console.developers.google.com/XXX
  {
    regex: /User Rate Limit Exceeded\. Rate of requests for user exceed configured project quota\./,
    ref: NORMALIZED_ERRORS.USER_RATE_LIMIT_EXCEEDED,
    locale: 'en',
  },

  // Daily Limit Exceeded. The quota will be reset at midnight Pacific Time (PT).
  // You may monitor your quota usage and adjust limits in the API Console: https://console.developers.google.com/XXX
  {
    regex: /Daily Limit Exceeded\. The quota will be reset at midnight Pacific Time/,
    ref: NORMALIZED_ERRORS.DAILY_LIMIT_EXCEEDED,
    locale: 'en',
  },

  // Service invoked too many times for one day: XXX. (XXX: urlFetch, email)
  {
    regex: /^Service invoked too many times for one day: ([^.]*)\.$/,
    variables: ['service'],
    ref: NORMALIZED_ERRORS.SERVICE_INVOKED_TOO_MANY_TIMES_FOR_ONE_DAY,
    locale: 'en',
  },
  {
    regex: /^Trop d'appels pour ce service aujourd'hui : ([^.]*)\.$/,
    variables: ['service'],
    ref: NORMALIZED_ERRORS.SERVICE_INVOKED_TOO_MANY_TIMES_FOR_ONE_DAY,
    locale: 'fr',
  },
  {
    regex: /^Servicio solicitado demasiadas veces en un mismo d??a: ([^.]*)\.$/,
    variables: ['service'],
    ref: NORMALIZED_ERRORS.SERVICE_INVOKED_TOO_MANY_TIMES_FOR_ONE_DAY,
    locale: 'es',
  },
  {
    regex: /^Servicio solicitado demasiadas veces para un mismo d??a: ([^.]*)\.$/,
    variables: ['service'],
    ref: NORMALIZED_ERRORS.SERVICE_INVOKED_TOO_MANY_TIMES_FOR_ONE_DAY,
    locale: 'es',
  },
  {
    regex: /^Servi??o chamado muitas vezes no mesmo dia: ([^.]*)\.$/,
    variables: ['service'],
    ref: NORMALIZED_ERRORS.SERVICE_INVOKED_TOO_MANY_TIMES_FOR_ONE_DAY,
    locale: 'pt',
  },
  {
    regex: /^D???ch v??? b??? g???i qu?? nhi???u l???n trong m???t ng??y: ([^.]*)\.$/,
    variables: ['service'],
    ref: NORMALIZED_ERRORS.SERVICE_INVOKED_TOO_MANY_TIMES_FOR_ONE_DAY,
    locale: 'vi',
  },
  {
    regex: /^Layanan terlalu sering diminta di hari yang sama: ([^.]*)\.$/,
    variables: ['service'],
    ref: NORMALIZED_ERRORS.SERVICE_INVOKED_TOO_MANY_TIMES_FOR_ONE_DAY,
    locale: 'id',
  },
  {
    regex: /^Service is te vaak aangeroepen voor ????n dag: ([^.]*)\.$/,
    variables: ['service'],
    ref: NORMALIZED_ERRORS.SERVICE_INVOKED_TOO_MANY_TIMES_FOR_ONE_DAY,
    locale: 'nl',
  },

  // Service unavailable: XXX (XXX: Docs)
  {
    regex: /^Service unavailable: (.*)$/,
    variables: ['service'],
    ref: NORMALIZED_ERRORS.SERVICE_UNAVAILABLE,
    locale: 'en',
  },

  // Service error: XXX (XXX: Spreadsheets)
  {
    regex: /^Service error: (.*)$/,
    variables: ['service'],
    ref: NORMALIZED_ERRORS.SERVICE_ERROR,
    locale: 'en',
  },
  {
    regex: /^Erro de servi??o: (.*)$/,
    variables: ['service'],
    ref: NORMALIZED_ERRORS.SERVICE_ERROR,
    locale: 'pt',
  },

  // "Invalid argument: XXX" - wrong email alias used - eg: Gmail App.sendEmail()
  {
    regex: /^Invalid argument: (.*)$/,
    variables: ['email'],
    ref: NORMALIZED_ERRORS.INVALID_ARGUMENT,
    locale: 'en',
  },

  // "A sheet with the name "XXX" already exists. Please enter another name." - eg: [Sheet].setName()
  {
    regex: /^A sheet with the name "([^"]*)" already exists\. Please enter another name\.$/,
    variables: ['sheetName'],
    ref: NORMALIZED_ERRORS.SHEET_ALREADY_EXISTS_PLEASE_ENTER_ANOTHER_NAME,
    locale: 'en',
  },
  {
    regex: /^A sheet with the name ???([^???]*)??? already exists\. Please enter another name\.$/,
    variables: ['sheetName'],
    ref: NORMALIZED_ERRORS.SHEET_ALREADY_EXISTS_PLEASE_ENTER_ANOTHER_NAME,
    locale: 'en_NZ',
  },
  {
    regex: /^Ya existe una hoja con el nombre "([^"]*)"\. Ingresa otro\.$/,
    variables: ['sheetName'],
    ref: NORMALIZED_ERRORS.SHEET_ALREADY_EXISTS_PLEASE_ENTER_ANOTHER_NAME,
    locale: 'es_419',
  },
  {
    regex: /^Ya existe una hoja con el nombre "([^"]*)"\. Introduce un nombre distinto\.$/,
    variables: ['sheetName'],
    ref: NORMALIZED_ERRORS.SHEET_ALREADY_EXISTS_PLEASE_ENTER_ANOTHER_NAME,
    locale: 'es',
  },
  {
    regex: /^???? t???n t???i m???t trang t??nh c?? t??n "([^"]*)"\. Vui l??ng nh???p t??n kh??c\.$/,
    variables: ['sheetName'],
    ref: NORMALIZED_ERRORS.SHEET_ALREADY_EXISTS_PLEASE_ENTER_ANOTHER_NAME,
    locale: 'vi',
  },
  {
    regex: /^Une feuille nomm??e "([^"]*)" existe d??j??\. Veuillez saisir un autre nom\.$/,
    variables: ['sheetName'],
    ref: NORMALIZED_ERRORS.SHEET_ALREADY_EXISTS_PLEASE_ENTER_ANOTHER_NAME,
    locale: 'fr',
  },
  {
    regex: /^Une feuille nomm??e ?? ([^??]*)?? existe d??j??\. Veuillez saisir un autre nom\.$/,
    variables: ['sheetName'],
    ref: NORMALIZED_ERRORS.SHEET_ALREADY_EXISTS_PLEASE_ENTER_ANOTHER_NAME,
    locale: 'fr_CA',
  },
  {
    regex: /^Esiste gi?? un foglio con il nome "([^"]*)"\. Inserisci un altro nome\.$/,
    variables: ['sheetName'],
    ref: NORMALIZED_ERRORS.SHEET_ALREADY_EXISTS_PLEASE_ENTER_ANOTHER_NAME,
    locale: 'it',
  },
  {
    regex: /^????????????????????????([^???]*)??????????????????????????????????????????$/,
    variables: ['sheetName'],
    ref: NORMALIZED_ERRORS.SHEET_ALREADY_EXISTS_PLEASE_ENTER_ANOTHER_NAME,
    locale: 'zh_TW',
  },
  {
    regex: /^Es ist bereits ein Tabellenblatt mit dem Namen "([^"]*)" vorhanden\. Geben Sie einen anderen Namen ein\.$/,
    variables: ['sheetName'],
    ref: NORMALIZED_ERRORS.SHEET_ALREADY_EXISTS_PLEASE_ENTER_ANOTHER_NAME,
    locale: 'de',
  },
  {
    regex: /^????????? ???([^???]*)?????? ????????? ?????? ????????????\. ?????? ????????? ????????? ?????????\.$/,
    variables: ['sheetName'],
    ref: NORMALIZED_ERRORS.SHEET_ALREADY_EXISTS_PLEASE_ENTER_ANOTHER_NAME,
    locale: 'ko',
  },
  {
    regex: /^???????????????([^???]*)?????????????????????????????????????????????????????????????????????????????????$/,
    variables: ['sheetName'],
    ref: NORMALIZED_ERRORS.SHEET_ALREADY_EXISTS_PLEASE_ENTER_ANOTHER_NAME,
    locale: 'ja',
  },
  {
    regex: /^Er is al een blad met de naam ([^.]*)\. Geef een andere naam op\.$/,
    variables: ['sheetName'],
    ref: NORMALIZED_ERRORS.SHEET_ALREADY_EXISTS_PLEASE_ENTER_ANOTHER_NAME,
    locale: 'nl',
  },
  {
    regex: /^J?? existe uma p??gina chamada "([^"]*)"\. Insira outro nome\.$/,
    variables: ['sheetName'],
    ref: NORMALIZED_ERRORS.SHEET_ALREADY_EXISTS_PLEASE_ENTER_ANOTHER_NAME,
    locale: 'pt',
  },
  {
    regex: /^???????? "([^"]*)" ?????? ????????????????????\. ?????????????? ???????????? ????????????????\.$/,
    variables: ['sheetName'],
    ref: NORMALIZED_ERRORS.SHEET_ALREADY_EXISTS_PLEASE_ENTER_ANOTHER_NAME,
    locale: 'ru',
  },
  {
    regex: /^H??rok s n??zvom ([^??]*) u?? existuje\. Zadajte in?? n??zov\.$/,
    variables: ['sheetName'],
    ref: NORMALIZED_ERRORS.SHEET_ALREADY_EXISTS_PLEASE_ENTER_ANOTHER_NAME,
    locale: 'sk',
  },
];

/**
 * @typedef {Object} ErrorHandler_.PartialMatcher
 *
 * @property {RegExp} regex - Regex describing the error
 * @property {Array<string>} [variables] - Ordered list naming the successive extracted value by the regex groups
 * @property {ErrorHandler_.NORMALIZED_ERROR} ref - Error reference
 * @property {string} locale - Error locale
 */
/**
 * @typedef {Object} ErrorHandler_.ErrorMatcher
 *
 * @property {ErrorHandler_.NORMALIZED_ERROR} ref - Error reference
 * @property {string} locale - Error locale
 */

//</editor-fold>
