"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareObjects = compareObjects;
const microdiff_1 = __importDefault(require("microdiff"));
const utils_1 = require("./utils");
function compareObjects(original, modified, matchOnMap = {}) {
    const result = JSON.parse(JSON.stringify(modified));
    const getMatchOnByName = (fullPath) => {
        console.log('🔍 BUSCANDO MATCH PARA:', fullPath);
        const normalizePath = (path) => {
            return path.replace(/\[\d+\]/g, '').split('.').filter(part => part !== '');
        };
        const pathParts = normalizePath(fullPath);
        console.log('📝 PATH NORMALIZADO:', pathParts);
        let current = matchOnMap;
        for (let i = 0; i < pathParts.length; i++) {
            const part = pathParts[i];
            console.log(`🔄 Procesando parte ${i}: "${part}"`, 'Current:', current);
            if (current && current[part] !== undefined) {
                current = current[part];
                console.log(`✅ Encontrado:`, current);
            }
            else if (current && current.children && current.children[part] !== undefined) {
                current = current.children[part];
                console.log(`✅ Encontrado en children:`, current);
            }
            else {
                console.log(`❌ No encontrado: "${part}"`);
                return undefined;
            }
            // Si es un nodo con matchOn y es la última parte, devolver matchOn
            if (i === pathParts.length - 1 && current && typeof current === 'object' && !Array.isArray(current) && current.matchOn) {
                console.log(`🎯 Devolviendo matchOn:`, current.matchOn);
                return current.matchOn;
            }
        }
        console.log(`📦 Resultado final:`, Array.isArray(current) ? current : undefined);
        return Array.isArray(current) ? current : undefined;
    };
    const rutasUnificadas = getUnifiedPaths(original, modified);
    for (const pathInfo of rutasUnificadas) {
        processPath(pathInfo.ruta, original, modified, result, getMatchOnByName);
    }
    return result;
}
function processPath(path, original, modified, result, getMatchOnByName) {
    const originalValue = (0, utils_1.getByPath)(original, path);
    const modifiedValue = (0, utils_1.getByPath)(modified, path);
    let operation = 'none';
    if (originalValue === undefined && modifiedValue !== undefined) {
        operation = 'insert';
    }
    else if (originalValue !== undefined && modifiedValue === undefined) {
        operation = 'delete';
    }
    else if (Array.isArray(originalValue) && Array.isArray(modifiedValue)) {
        const matchFields = getMatchOnByName(path);
        const esArrayDePrimitivos = originalValue.length > 0 && typeof originalValue[0] !== 'object';
        if (matchFields && !esArrayDePrimitivos) {
            const nuevoArreglo = compareArrayWithMatch(originalValue, modifiedValue, matchFields);
            (0, utils_1.setByPath)(result, path, nuevoArreglo);
            return;
        }
        else {
            const diferencias = (0, microdiff_1.default)(originalValue, modifiedValue, { shallow: true });
            operation = diferencias.length > 0 ? 'update' : 'none';
            // CREAR NUEVO ARRAY CON _op
            const arrayConOp = [...modifiedValue];
            Object.assign(arrayConOp, { _op: operation });
            (0, utils_1.setByPath)(result, path, arrayConOp);
            return;
        }
    }
    else {
        const diferencias = (0, microdiff_1.default)(originalValue, modifiedValue, { shallow: true });
        operation = diferencias.length > 0 ? 'update' : 'none';
    }
    const resultPath = (0, utils_1.getByPath)(result, path);
    if (resultPath && typeof resultPath === 'object') {
        resultPath._op = operation;
    }
}
function compareArrayWithMatch(originalArr, modifiedArr, matchFields) {
    const newArr = [];
    // Elementos modificados y sin cambios
    for (const elemMod of modifiedArr) {
        const elemOrig = findElement(originalArr, elemMod, matchFields);
        if (elemOrig) {
            // Existe en ambos, verificar si cambió
            const element = { ...elemMod };
            const diferencias = (0, microdiff_1.default)(elemOrig, elemMod, { shallow: true });
            element._op = diferencias.length > 0 ? 'update' : 'none';
            // Si el elemento tiene hijos anidados, procesarlos también
            if (element._op === 'update' || element._op === 'none') {
                // Procesar hijos anidados aquí si es necesario
            }
            newArr.push(element);
        }
        else {
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
function markAllChildrenWithOp(obj, op) {
    for (const key in obj) {
        if (obj[key] && typeof obj[key] === 'object') {
            if (Array.isArray(obj[key])) {
                // Para arrays anidados, marcar cada elemento como insert
                obj[key] = obj[key].map((item) => {
                    if (item && typeof item === 'object') {
                        return {
                            ...item,
                            _op: op
                        };
                    }
                    return item;
                });
            }
            else {
                // Para objetos anidados
                if (obj[key]._op === undefined) {
                    obj[key]._op = op;
                }
                markAllChildrenWithOp(obj[key], op);
            }
        }
    }
}
function findElement(arr, elemento, matchFields) {
    return arr.find(item => {
        for (const field of matchFields) {
            if (item[field] !== undefined && item[field] === elemento[field]) {
                return true;
            }
        }
        return false;
    });
}
function getComplexPathsWithType(obj, prefix = "") {
    const rutas = [];
    if (obj === null || obj === undefined) {
        return rutas;
    }
    if (Array.isArray(obj)) {
        rutas.push({ ruta: prefix || "(root)", tipo: 'array' });
        obj.forEach((item, index) => {
            if (item && typeof item === "object") {
                // AGREGAR ESTA LÍNEA: Incluir el path del array hijo
                const arrayPath = `${prefix}[${index}]`;
                rutas.push(...getComplexPathsWithType(item, arrayPath));
            }
        });
    }
    else if (obj && typeof obj === "object") {
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
function getUnifiedPaths(original, modificado) {
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
