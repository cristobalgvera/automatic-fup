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
declare namespace ErrorHandler {
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
  function expBackoff(
    func: Function,
    options?: {
      throwOnFailure?: boolean;
      doNotLogKnownErrors?: boolean;
      verbose?: boolean;
      retryNumber?: number;
    }
  ): any | ErrorHandler_.CustomError;

  /**
   * Helper function to automatically handles exponential backoff on UrlFetch use
   *
   * @param {string} url
   * @param {Object} [params]
   * @param {Object} [expBackoffOptions] - options for exponential backoff - see expBackoff() function
   *
   * @return {UrlFetchApp.HTTPResponse}  - fetch response
   */
  function urlFetchWithExpBackOff(
    url: string,
    params?: any,
    expBackoffOptions?: any
  ): any;
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
  function logError(
    error: string | Error | object,
    additionalParams?: any,
    options?: {
      asWarning?: boolean;
      doNotLogKnownErrors?: boolean;
    }
  ): Error;
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
  function getNormalizedError(
    localizedErrorMessage: string,
    partialMatches?: Array<{
      variable: string;
      value: string;
    }>
  ): ErrorHandler_.NORMALIZED_ERROR | '';
  /**
   * Try to find the locale of the localized thrown error
   *
   * @param {string} localizedErrorMessage
   *
   * @return {string | ''} return the locale or '' if no matching error found
   */
  function getErrorLocale(localizedErrorMessage: string): string | '';
  namespace NORMALIZED_ERRORS {
    const CONDITIONNAL_RULE_REFERENCE_DIF_SHEET: string;
    const TRYING_TO_EDIT_PROTECTED_CELL: string;
    const SHEET_NOT_FOUND: string;
    const RANGE_NOT_FOUND: string;
    const RANGE_COORDINATES_ARE_OUTSIDE_SHEET_DIMENSIONS: string;
    const RANGE_COORDINATES_INVALID: string;
    const NO_ITEM_WITH_GIVEN_ID_COULD_BE_FOUND: string;
    const NO_PERMISSION_TO_ACCESS_THE_REQUESTED_DOCUMENT: string;
    const LIMIT_EXCEEDED_DRIVE_APP: string;
    const LIMIT_EXCEEDED_DRIVE: string;
    const ACTION_REQUIRES_SHARED_DRIVE_MEMBERSHIP: string;
    const MAIL_SERVICE_NOT_ENABLED: string;
    const INVALID_THREAD_ID_VALUE: string;
    const LABEL_ID_NOT_FOUND: string;
    const LABEL_NAME_EXISTS_OR_CONFLICTS: string;
    const INVALID_LABEL_NAME: string;
    const NO_RECIPIENT: string;
    const IMAP_FEATURES_DISABLED_BY_ADMIN: string;
    const LIMIT_EXCEEDED_MAX_RECIPIENTS_PER_MESSAGE: string;
    const LIMIT_EXCEEDED_EMAIL_BODY_SIZE: string;
    const LIMIT_EXCEEDED_EMAIL_TOTAL_ATTACHMENTS_SIZE: string;
    const LIMIT_EXCEEDED_EMAIL_SUBJECT_LENGTH: string;
    const GMAIL_NOT_DEFINED: string;
    const GMAIL_OPERATION_NOT_ALLOWED: string;
    const CALENDAR_SERVICE_NOT_ENABLED: string;
    const SERVER_ERROR_RETRY_LATER: string;
    const SERVER_ERROR_DEADLINE_EXCEEDED: string;
    const AUTHORIZATION_REQUIRED: string;
    const SERVER_ERROR_PERMISSION_DENIED: string;
    const EMPTY_RESPONSE: string;
    const BAD_VALUE: string;
    const LIMIT_EXCEEDED: string;
    const USER_RATE_LIMIT_EXCEEDED: string;
    const RATE_LIMIT_EXCEEDED: string;
    const NOT_FOUND: string;
    const BAD_REQUEST: string;
    const BACKEND_ERROR: string;
    const UNABLE_TO_TALK_TO_TRIGGER_SERVICE: string;
    const ACTION_NOT_ALLOWED_THROUGH_EXEC_API: string;
    const TOO_MANY_LOCK_OPERATIONS: string;
    const TOO_MANY_TRIGGERS_FOR_THIS_USER_ON_THE_PROJECT: string;
    const INVALID_EMAIL: string;
    const DOCUMENT_MISSING: string;
    const USER_RATE_LIMIT_EXCEEDED_RETRY_AFTER_SPECIFIED_TIME: string;
    const DAILY_LIMIT_EXCEEDED: string;
    const SERVICE_INVOKED_TOO_MANY_TIMES_FOR_ONE_DAY: string;
    const SERVICE_UNAVAILABLE: string;
    const SERVICE_ERROR: string;
    const INVALID_ARGUMENT: string;
    const SHEET_ALREADY_EXISTS_PLEASE_ENTER_ANOTHER_NAME: string;
  }

  export {expBackoff};
  export {urlFetchWithExpBackOff};
  export {logError};
  export {getNormalizedError};
  export {getErrorLocale};
  export {NORMALIZED_ERRORS};
}
declare namespace ErrorHandler_ {
  export const _this: typeof globalThis;
  export function _convertErrorStack(
    stack: string,
    addonName?: string
  ): {
    stack: string;
    lastFunctionName: string;
  };
  export const _ERROR_MESSAGE_TRANSLATIONS: any;
  export const _ERROR_PARTIAL_MATCH: Array<ErrorHandler_.PartialMatcher>;
  type CustomError = Error;
  type NORMALIZED_ERROR = string;
  type PartialMatcher = {
    /**
     * - Regex describing the error
     */
    regex: RegExp;
    /**
     * - Ordered list naming the successive extracted value by the regex groups
     */
    variables?: Array<string>;
    /**
     * - Error reference
     */
    ref: ErrorHandler_.NORMALIZED_ERROR;
    /**
     * - Error locale
     */
    locale: string;
  };
  type ErrorMatcher = {
    /**
     * - Error reference
     */
    ref: ErrorHandler_.NORMALIZED_ERROR;
    /**
     * - Error locale
     */
    locale: string;
  };
}
