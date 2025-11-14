import diff from "microdiff";
import { CrudOperation, MatchOnMap, PathInfo } from "./types";
import { getByPath, setByPath } from "./utils";

export function compareObjects(
    original: any,
    modified: any,
    matchOnMap: MatchOnMap = {}
): any {
    const result = JSON.parse(JSON.stringify(modified));
    
    const getMatchOnByName = (nombreArray: string): string[] | undefined => {
        return matchOnMap[nombreArray];
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
    getMatchOnByName: (nombreArray: string) => string[] | undefined
): void {
    const originalValue = getByPath(original, path);
    const modifiedValue = getByPath(modified, path);

    let operation: CrudOperation = 'none';
    
    if (originalValue === undefined && modifiedValue !== undefined) {
        operation = 'insert';
    } else if (originalValue !== undefined && modifiedValue === undefined) {
        operation = 'delete';
    } else if (Array.isArray(originalValue) && Array.isArray(modifiedValue)) {
        const arrayName = path.split('.').pop() || path;
        const matchFields = getMatchOnByName(arrayName);

        const esArrayDePrimitivos = originalValue.length > 0 && typeof originalValue[0] !== 'object';

        
        if (matchFields && !esArrayDePrimitivos) {
            const nuevoArreglo = compareArrayWithMatch(originalValue, modifiedValue, matchFields);
            setByPath(result, path, nuevoArreglo);
            return; // No asignar Operacion al array completo
        } else {
            // const diferencias = diff(originalValue, modifiedValue, { shallow: true });
            // operacion = diferencias.length > 0 ? 'update' : 'none';
            const diferencias = diff(originalValue, modifiedValue, { shallow: true });
            operation = diferencias.length > 0 ? 'update' : 'none';
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
        newArr.push(element);
        } else {
        // No existe en original → INSERT
        const element = { ...elemMod };
        element._op = 'insert';
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
        newArr.push(element);
        }
    }

    return newArr;
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