import Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;

export interface ByEmailSpreadsheets {
  [email: string]: Spreadsheet[];
}
