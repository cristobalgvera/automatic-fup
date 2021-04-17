/**
 * Use this function when you need to find item values in a table by index field.
 * Unlike the original method getItemById, this function does not create a sheetfu table.
 * It is a convenient alternative in large databases where the search performance is key.
 * For example, look up a price of an automotive part by the part number.
 *
 * @param {String} sheetName: Name of the target sheet.
 * @param {Number} headerRow: Row number where the header is.
 * @param {String} indexField: Field name in header where you want to lookup the value.
 * @param {*} lookupValue: Value you want to look up.
 * @param {Boolean} isSorted: Whether the index field is sorted or not.
 * @return {Object} An object item containing only values, where fields match the header values.
 */
declare function getItemValuesById(sheetName: string, headerRow: number, indexField: string, lookupValue: any, isSorted: boolean): any;
