/**
 * Function to create a Table Object for a whole sheet
 * @param {string} sheetName: Name of the sheet to create a Table from
 * @param {number} headerRow: Row number where the header is.
 * @param {String} indexField: Field name you want to create an index with (commonly for ID field for fast lookup).
 * @returns {Table}
 */
declare function getTable(sheetName: string, headerRow: number, indexField: string): Table;
/**
 * Function to create a Table Object from a Named Range. The range should contain a header in the first row.
 * Named ranges are ranges that have associated string aliases.
 * They can be viewed and edited via the Sheets UI under the Data > Named ranges... menu.
 * @param {string} namedRange: Name of the range to create a Table from
 * @param {String} indexField: Field name you want to create an index with (commonly for ID field for fast lookup).
 * @returns {Table}
 */
declare function getTableByName(namedRange: string, indexField: string): Table;
/** Constructor which create a Table object to query data, get and post. Object to use when rows in sheet are not uniquely
 * identifiable (no id). Use Table Class for DB-like queries instead (when unique id exist for each row).
 * @param {Range} gridRange: a range object from Google spreadsheet. First row of range must be the headers.
 * @param {String} indexField: Field name you want to create an index with (commonly for ID field for fast lookup).
 * @constructor
 */
declare function Table(gridRange: Range, indexField: string): void;
declare class Table {
    /** Constructor which create a Table object to query data, get and post. Object to use when rows in sheet are not uniquely
     * identifiable (no id). Use Table Class for DB-like queries instead (when unique id exist for each row).
     * @param {Range} gridRange: a range object from Google spreadsheet. First row of range must be the headers.
     * @param {String} indexField: Field name you want to create an index with (commonly for ID field for fast lookup).
     * @constructor
     */
    constructor(gridRange: Range, indexField: string);
    gridRange: Range;
    initialGridRange: Range;
    header: any[];
    items: any[];
    indexField: string;
    index: any;
    getHeader(): any[];
    getIndex(indexField: any): any;
    initiateItems(): any[];
    commit(): void;
    commitValues(): void;
    getItemsRange(): Range;
    getGridData(): object;
    getGridValues(): any[][];
    select(criteria: any[]): any[];
    update(item: object): void;
    updateMany(manyItems: object[]): void;
    deleteSelection(filterObject: any): void;
    deleteMany(itemList: any): void;
    deleteOne(item: any): void;
    deleteAll(): void;
    cleanInitialGrid(): void;
    getHeaderRange(): Range;
    add(input_item: object): any;
    sortBy(key: string, ascending: boolean): object[];
    clearBackgrounds(): Range;
    getItemById(valueId: any): any;
    getFieldValueById(field: any, valueId: any): any;
    distinct(field: any): any[];
}
/**
 * Function to trim the rows of a range. The range should contain a header in the first row.
 * @param {Range} range: a range object from Google spreadsheet. First row of range must be the headers.
 * @returns {Range}
 */
declare function trimRangeRows(range: Range): Range;
/**
 * Function to clone an object and simulate inheritance.
 */
declare function cloneObj(obj: any): any;
/**
 * SubArray class constructor to have more ORM like methods to the arrays used in the Table class.
 */
declare function GridArray(): void;
declare class GridArray {
    first(): any;
    limit(x: any): any;
}
