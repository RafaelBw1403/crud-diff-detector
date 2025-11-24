import { MatchOnMap } from "./types";
/**
 * Compara dos objetos (original y modificado) y devuelve una copia del objeto modificado
 * con una propiedad `_op` en cada nodo que indica la operación realizada ('insert', 'update', 'delete', 'none').
 *
 * @param original El objeto original.
 * @param modified El objeto modificado.
 * @param matchOnMap Un mapa que define qué campos usar para emparejar elementos en arrays.
 * @returns El objeto modificado con las marcas de operación `_op`.
 */
export declare function compareObjects(original: any, modified: any, matchOnMap?: MatchOnMap): any;
