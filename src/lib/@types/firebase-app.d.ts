declare namespace FirebaseApp_ {
  export function Base(base: globalThis.Base): void;
  type Base = {
    base: Base;
    createAuthToken?: (
      userEmail: string,
      optAuthData: any,
      serviceAccountEmail: string,
      privateKey: string,
      ...args: any[]
    ) => any;
    getData?: <T>(
      path: string,
      optQueryParameters?: OptQueryParameters
    ) => T | undefined;
    getAllData?: (requests: (string | FirebaseApp_.request)[]) => any;
    pushData?: <T>(
      path: string,
      data: T,
      optQueryParameters?: OptQueryParameters
    ) => string;
    setData?: <T>(
      path: string,
      data: T,
      optQueryParameters?: OptQueryParameters
    ) => T;
    updateData?: <T>(
      path: string,
      data: T,
      optQueryParameters?: OptQueryParameters
    ) => T;
    removeData?: (
      path: string,
      optQueryParameters?: OptQueryParameters
    ) => null;
    getUrlFromPath?: (path: string) => string;
  };
  export const _CustomClaimBlackList: {
    iss: boolean;
    sub: boolean;
    aud: boolean;
    exp: boolean;
    iat: boolean;
    auth_time: boolean;
    nonce: boolean;
    acr: boolean;
    amr: boolean;
    azp: boolean;
    email: boolean;
    email_verified: boolean;
    'phone_number\t': boolean;
    name: boolean;
    'firebase\t': boolean;
  };
  export namespace _keyWhiteList {
    const auth: boolean;
    const shallow: boolean;
    const print: boolean;
    const limitToFirst: boolean;
    const limitToLast: boolean;
  }
  export const _errorCodeList: {
    400: boolean;
    500: boolean;
    502: boolean;
  };
  export namespace _methodWhiteList {
    export const post: boolean;
    export const put: boolean;
    const _delete: boolean;
    export {_delete as delete};
  }
  export namespace NORMALIZED_ERRORS {
    const TRY_AGAIN: string;
    const GLOBAL_CRASH: string;
    const PERMISSION_DENIED: string;
    const INVALID_DATA: string;
    const INVALID_DATA_BIS: string;
    const INVALID_CUSTOM_CLAIMS_KEY: string;
    const INVALID_CUSTOM_CLAIMS_LENGTH: string;
    const URLFETCHAPP_CRASH: string;
  }
  // export const NORETRY_ERRORS: typeof NORETRY_ERRORS;
  export function _buildAllRequests(
    requests: (string | request)[],
    db: Base
  ): any[];
  export function _sendAllRequests(
    finalRequests: {
      url: string;
      headers: {};
      muteHttpExceptions: boolean;
      method: string;
      data?: string;
      payload?: string;
    }[],
    originalsRequests: request[],
    db: Base,
    n?: number
  ): any;
  export function _encodeAllKeys(object: any): any;
  type NORMALIZED_ERROR = string;
  type request = {
    path: string;
    method?: 'get' | 'post' | 'put' | 'patch' | 'delete';
    data?: any;
    optQueryParameters?: OptQueryParameters;
    response?: any;
    error?: Error;
  };
}
declare const baseClass_: any;
declare namespace FirebaseApp {
  /**
   * Retrieves a database by url
   *
   * @param  {string} url - the database url
   * @param  {string} [optSecret] - a Firebase app secret
   *
   * @returns {FirebaseApp_.Base} the Database found at the given URL
   */
  function getDatabaseByUrl(url: string, optSecret?: string): FirebaseApp_.Base;
  /**
   * Returns a valid Firebase key from a given string
   * Firebase Keys can't contain any of the following characters: . $ # [ ] /
   * https://firebase.google.com/docs/database/usage/limits#data_tree
   * https://groups.google.com/forum/#!msg/firebase-talk/vtX8lfxxShk/skzA5vQFdosJ
   *
   * @param  {string} string - the string to encode
   *
   * @returns {string} the encoded string
   */
  function encodeAsFirebaseKey(string: string): string;
  /**
   * Returns a decoded string from a Firebase key encoded by encodeAsFirebaseKey()
   *
   * @param  {string} string - the encoded Firebase key
   *
   * @returns {string} the decoded string
   */
  function decodeFirebaseKey(string: string): string;
  /**
   * Signs in or signs up a user using credentials from an Identity Provider (IdP) - eg: google.com.
   * https://cloud.google.com/identity-platform/docs/reference/rest/v1/accounts/signInWithIdp
   *
   *
   * @param  {object} firebaseConfig - see the "Get config object for your web app" section in the page linked below.
   *                                   https://support.google.com/firebase/answer/7015592?hl=en
   * @param  {string} idToken - an OpenID Connect identity token retrieved via ScriptApp.getIdentityToken()
   * @returns {object} the auth token granting access to firebase
   */
  function signInWithIdp(firebaseConfig: object, idToken: string): object;
  export {getDatabaseByUrl};
  export {encodeAsFirebaseKey};
  export {decodeFirebaseKey};
  export {signInWithIdp};
  import NORMALIZED_ERRORS_1 = FirebaseApp_.NORMALIZED_ERRORS;
  export {NORMALIZED_ERRORS_1 as NORMALIZED_ERRORS};
}
type Base = {
  url: string;
  secret?: string;
  serviceAccountEmail?: string;
  privateKey?: string;
};
/**
 * https://firebase.google.com/docs/reference/rest/database?hl=en#section-query-parameters
 */
type OptQueryParameters = {
  auth?: string;
  /**
   * - Set this to true to limit the depth of the data returned at a location.
   */
  shallow?: boolean;
  /**
   * - Formats the data returned in the response from the server.
   */
  print?: PRINT;
  /**
   * - Attribute to point searched parameters
   */
  orderBy?: string;
  /**
   * - Define first string to accept when filter data
   */
  startAt?: string;
  /**
   * - Define last string to accept when filter data
   */
  endAt?: string;
  /**
   * - Define exact match to find
   */
  equalTo?: string;
  limitToFirst?: string;
  limitToLast?: string;
};

declare enum PRINT {
  PRETTY = 'pretty',
  SILENT = 'silent',
}
