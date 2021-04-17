/**
 * Constructor for an item in a Table object.
 * @param {Number} i: id/order of the item in the Table frame. Start at 0 (first item in grid).
 * @param {Range} range: the grid range the item is from.
 * @param {Array} header: The header array.
 * @constructor
 */
declare function Item(i: number, header: any[], row: any, column: any, sheet: any): void;
declare class Item {
    /**
     * Constructor for an item in a Table object.
     * @param {Number} i: id/order of the item in the Table frame. Start at 0 (first item in grid).
     * @param {Range} range: the grid range the item is from.
     * @param {Array} header: The header array.
     * @constructor
     */
    constructor(i: number, header: any[], row: any, column: any, sheet: any);
    fields: {};
    table: {};
    i: number;
    authorizedToCommit: boolean;
    addField(label: string, value: string | number | Date, note: string, background: string, formula: string, font: string): void;
    toObject(): any;
    commit(): void;
    commitValues(): void;
    commitBackgrounds(): void;
    commitField(field: string): void;
    commitFieldValue(field: string): void;
    getLineRange(): Range;
    getFieldRange(field: string): number;
    getFieldValue(field: string): any;
    setFieldValue(field: string, value: string | number | Date): Item;
    getFieldNote(field: string): any;
    setFieldNote(field: string, note: string): Item;
    getFieldBackground(field: string): any;
    setFieldBackground(field: string, background: string): Item;
    setBackground(color: string): Item;
    setFontColor(color: string): Item;
    getFieldFormula(field: string): any;
    setFieldFormula(field: string, formula: string): Item;
    getFieldFontColor(field: string): any;
    setFieldFontColor(field: string, fontColor: string): Item;
}
