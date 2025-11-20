export type CrudOperation = 'insert' | 'update' | 'delete' | 'none';
export interface BaseWithOperation {
    _op?: CrudOperation;
}
export type MatchOnValue = string[] | MatchOnNode;
export interface MatchOnMap {
    [arrayName: string]: MatchOnValue;
}
export interface MatchOnNode {
    matchOn?: string[];
    children?: MatchOnMap;
}
export interface PathInfo {
    ruta: string;
    tipo: 'objeto' | 'array' | 'string' | 'number' | 'boolean' | 'null' | 'undefined';
}
