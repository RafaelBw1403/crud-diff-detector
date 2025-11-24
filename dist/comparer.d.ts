import { MatchOnMap } from "./types";
/**
 * Compares two objects (original and modified) and returns a copy of the modified object
 * with an `_op` property on each node indicating the operation performed ('insert', 'update', 'delete', 'none').
 *
 * @param original The original object.
 * @param modified The modified object.
 * @param matchOnMap A map defining which fields to use for matching elements in arrays.
 * @returns The modified object with `_op` operation marks.
 */
export declare function compareObjects(original: any, modified: any, matchOnMap?: MatchOnMap): any;
