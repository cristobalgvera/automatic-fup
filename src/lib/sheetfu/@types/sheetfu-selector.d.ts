/**
 * Constructor which creates a Selector object to query Items in a Table.
 * @param {Table} table: The Table object where to evaluate the criteria.
 * @param {Array} criteria: an array used as filter as an AND of ORs (see CNF). Examples:
 * >>> [{date: today}, [{tag: 1},{tag: 2}]] // (date === today && (tags === 1 || tags === 2))
 * >>> [[{assigneeId: 'GO'}, {assigneeId: 'AM'}]] // (assigneeId === 'GO' || assigneeId === 'AM')
 * >>> [{name: 'Guillem'}, {surname: 'Orpinell'}] // (name === 'Guillem' && surname === 'Orpinell')
 * >>> {name: 'Guillem', surname: 'Orpinell'} // (name === 'Guillem' && surname === 'Orpinell')
 * @constructor
 */
declare function Selector(table: any, criteria: any[]): void;
declare class Selector {
    /**
     * Constructor which creates a Selector object to query Items in a Table.
     * @param {Table} table: The Table object where to evaluate the criteria.
     * @param {Array} criteria: an array used as filter as an AND of ORs (see CNF). Examples:
     * >>> [{date: today}, [{tag: 1},{tag: 2}]] // (date === today && (tags === 1 || tags === 2))
     * >>> [[{assigneeId: 'GO'}, {assigneeId: 'AM'}]] // (assigneeId === 'GO' || assigneeId === 'AM')
     * >>> [{name: 'Guillem'}, {surname: 'Orpinell'}] // (name === 'Guillem' && surname === 'Orpinell')
     * >>> {name: 'Guillem', surname: 'Orpinell'} // (name === 'Guillem' && surname === 'Orpinell')
     * @constructor
     */
    constructor(table: any, criteria: any[]);
    table: any;
    criteria: any[];
    queryItems: any;
    getQueryItems(): any;
    evaluate(): Selector;
}
/**
 * Function to evaluate a criteria within an Item object.
 * @param {Item} item: The Item object where to evaluate the criteria.
 * @param {Array} criteria: an array used as filter as an AND of ORs (see CNF).
 @return {Boolean}
 */
declare function isMatching(item: any, andsArray: any): boolean;
/**
 * Function
 */
declare function someUnmatch(item: any, object: any): boolean;
/**
 * Function
 */
declare function noneMatches(item: any, orsArray: any): boolean;
/**
 * Function to check a matching between two values, considering also value as a Date.
 */
declare function valuesMatch(value1: any, value2: any): boolean;
/**
 * Returns if a value is an object
 */
declare function isObject(value: any): boolean;
