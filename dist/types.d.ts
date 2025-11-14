export type CrudOperation = 'insert' | 'update' | 'delete' | 'none';
export interface BaseWithOperation {
    _op?: CrudOperation;
}
export interface MatchOnMap {
    [arrayName: string]: string[];
}
export interface PathInfo {
    ruta: string;
    tipo: 'objeto' | 'array' | 'string' | 'number' | 'boolean' | 'null' | 'undefined';
}
