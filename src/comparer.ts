import diff from "microdiff";
import { CrudOperation, MatchOnMap, MatchOnNode, MatchOnValue, PathInfo } from "./types";
import { getByPath, setByPath } from "./utils";

export function compareObjects(
    original: any,
    modified: any,
    matchOnMap: MatchOnMap = {}
): any {
    const result = JSON.parse(JSON.stringify(modified));
    
    const getMatchOnByName = (fullPath: string): string[] | undefined => {

        
        const normalizePath = (path: string): string[] => {
            return path.replace(/\[\d+\]/g, '').split('.').filter(part => part !== '');
        };
        
        const pathParts = normalizePath(fullPath);

        
        let current: MatchOnValue | undefined = matchOnMap;
        
        for (let i = 0; i < pathParts.length; i++) {
            const part = pathParts[i];

            
            if (!current || typeof current !== 'object') {

                return undefined;
            }
            
            if (Array.isArray(current)) {

                return current;
            }
            
            // PRIMERO: Buscar directamente en el nivel actual
            if ((current as MatchOnMap)[part] !== undefined) {
                current = (current as MatchOnMap)[part];

            } 
            // SEGUNDO: Si es un nodo jerárquico, buscar en sus children
            else if (!Array.isArray(current) && current.children && (current.children as MatchOnMap)[part] !== undefined) {
                current = (current.children as MatchOnMap)[part];

            }
            // TERCERO: Buscar recursivamente en todos los children de los nodos
            else {

                let found = false;
                
                for (const key in current as MatchOnMap) {
                    const value: MatchOnValue = (current as MatchOnMap)[key];
                    if (!Array.isArray(value) && value?.children && (value.children as MatchOnMap)[part] !== undefined) {
                        current = (value.children as MatchOnMap)[part];
                        found = true;

                        break;
                    }
                }
                
                if (!found) {

                    return undefined;
                }
            }
        }
        
        // Si es un nodo jerárquico, devolver matchOn
        if (current && !Array.isArray(current) && current.matchOn) {

            return current.matchOn;
        }
        
        // Si es array simple, devolver directamente
        const result = Array.isArray(current) ? current : undefined;

        return result;
    };

    const rutasUnificadas = getUnifiedPaths(original, modified);
    
    for (const pathInfo of rutasUnificadas) {
        processPath(
        pathInfo.ruta, 
        original, 
        modified, 
        result, 
        getMatchOnByName
        );
    }
    
    return result;
}

function processPath(
    path: string,
    original: any,
    modified: any,
    result: any,
    getMatchOnByName: (fullPath: string) => string[] | undefined
): void {
    const originalValue = getByPath(original, path);
    const modifiedValue = getByPath(modified, path);

    let operation: CrudOperation = 'none';
    
    if (originalValue === undefined && modifiedValue !== undefined) {
        operation = 'insert';
    } else if (originalValue !== undefined && modifiedValue === undefined) {
        operation = 'delete';
    } else if (Array.isArray(originalValue) && Array.isArray(modifiedValue)) {
        const matchFields = getMatchOnByName(path);
        
        const esArrayDePrimitivos = originalValue.length > 0 && typeof originalValue[0] !== 'object';

        if (matchFields && !esArrayDePrimitivos) {
            const nuevoArreglo = compareArrayWithMatch(originalValue, modifiedValue, matchFields);
            setByPath(result, path, nuevoArreglo);
            return;
        } else {
            const diferencias = diff(originalValue, modifiedValue, { shallow: true });
            operation = diferencias.length > 0 ? 'update' : 'none';
            
            // CREAR NUEVO ARRAY CON _op
            const arrayConOp = {
                ...modifiedValue,
                _op: operation
            };
            setByPath(result, path, arrayConOp);
            return;
        }
    } else {
        const diferencias = diff(originalValue, modifiedValue, { shallow: true });
        operation = diferencias.length > 0 ? 'update' : 'none';
    }

    const resultPath = getByPath(result, path);
    if (resultPath && typeof resultPath === 'object') {
        resultPath._op = operation;
    }
}




function compareArrayWithMatch(
    originalArr: any[],
    modifiedArr: any[],
    matchFields: string[]
): any[] {
    const newArr = [];

    // Elementos modificados y sin cambios
    for (const elemMod of modifiedArr) {
        const elemOrig = findElement(originalArr, elemMod, matchFields);
        
        if (elemOrig) {
            // Existe en ambos, verificar si cambió
            const element = { ...elemMod };
            const diferencias = diff(elemOrig, elemMod, { shallow: true });
            element._op = diferencias.length > 0 ? 'update' : 'none';
            
            // Si el elemento tiene hijos anidados, procesarlos también
            if (element._op === 'update' || element._op === 'none') {
                // Procesar hijos anidados aquí si es necesario
            }
            
            newArr.push(element);
        } else {
            // No existe en original → INSERT
            const element = { ...elemMod };
            element._op = 'insert';
            
            // Marcar todos los hijos anidados como insert también
            markAllChildrenWithOp(element, 'insert');
            
            newArr.push(element);
        }
    }

    // Elementos eliminados
    for (const elemOrig of originalArr) {
        const elemMod = findElement(modifiedArr, elemOrig, matchFields);
        
        if (!elemMod) {
            // Existe en original pero no en modificado → DELETE
            const element = { ...elemOrig };
            element._op = 'delete';
            
            // Marcar todos los hijos anidados como delete también
            markAllChildrenWithOp(element, 'delete');
            
            newArr.push(element);
        }
    }

    return newArr;
}

function markAllChildrenWithOp(obj: any, op: string): void {
    for (const key in obj) {
        if (obj[key] && typeof obj[key] === 'object') {
            if (Array.isArray(obj[key])) {
                // Para arrays anidados, marcar cada elemento como insert
                obj[key] = obj[key].map((item: any) => {
                    if (item && typeof item === 'object') {
                        return {
                            ...item,
                            _op: op
                        };
                    }
                    return item;
                });
            } else {
                // Para objetos anidados
                if (obj[key]._op === undefined) {
                    obj[key]._op = op;
                }
                markAllChildrenWithOp(obj[key], op);
            }
        }
    }
}

function findElement(arr: any[], elemento: any, matchFields: string[]): any {
    return arr.find(item => {
        for (const field of matchFields) {
        if (item[field] !== undefined && item[field] === elemento[field]) {
            return true;
        }
        }
        return false;
    });
}



function getComplexPathsWithType(obj: any, prefix = ""): PathInfo[] {
    const rutas: PathInfo[] = [];

    if (obj === null || obj === undefined) {
        return rutas;
    }

    if (Array.isArray(obj)) {
        rutas.push({ ruta: prefix || "(root)", tipo: 'array' });
        
        obj.forEach((item, index) => {
        if (item && typeof item === "object") {
            const hasComplexSons = Object.values(item).some(
                val => val && typeof val === "object"
            );
            if (hasComplexSons) {
                rutas.push(...getComplexPathsWithType(item, `${prefix}[${index}]`));
            }
        }
        });
    } else if (obj && typeof obj === "object") {
        rutas.push({ ruta: prefix || "(root)", tipo: 'objeto' });
        
        for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            if (value && typeof value === "object") {
            const newPrefix = prefix ? `${prefix}.${key}` : key;
            rutas.push(...getComplexPathsWithType(value, newPrefix));
            }
        }
        }
    }

    return rutas;
}

function getUnifiedPaths(original: any, modificado: any): PathInfo[] {
    const originalPaths = getComplexPathsWithType(original);
    const modifiedPaths = getComplexPathsWithType(modificado);
    
    const unifiedPaths = [...originalPaths];
    
    for (const rutaMod of modifiedPaths) {
        const existe = unifiedPaths.some(rutaOrig => rutaOrig.ruta === rutaMod.ruta);
        if (!existe) {
        unifiedPaths.push(rutaMod);
        }
    }
    
    return unifiedPaths;
}