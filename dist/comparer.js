"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareObjects = compareObjects;
const microdiff_1 = __importDefault(require("microdiff"));
const utils_1 = require("./utils");
/**
 * Compares two objects (original and modified) and returns a copy of the modified object
 * with an `_op` property on each node indicating the operation performed ('insert', 'update', 'delete', 'none').
 *
 * @param original The original object.
 * @param modified The modified object.
 * @param matchOnMap A map defining which fields to use for matching elements in arrays.
 * @returns The modified object with `_op` operation marks.
 */
function compareObjects(original, modified, matchOnMap = {}) {
    // Create a deep copy of the modified object to avoid mutating the original and work on the result.
    const result = JSON.parse(JSON.stringify(modified));
    /**
     * Helper function to get match fields for a given path.
     * Searches `matchOnMap` for the configuration for the specified path.
     *
     * @param fullPath The full path of the node (e.g., "DatosProveedores[0].Representantes").
     * @returns An array of strings with key field names, or undefined if not found.
     */
    const getMatchOnByName = (fullPath) => {
        // Normalize path: Remove array indices to search in the configuration map.
        // Ex: "DatosProveedores[0].Representantes" -> "DatosProveedores.Representantes"
        const normalizedKey = fullPath.replace(/\[\d+\]/g, '');
        // Strategy 1: Direct search in the flat map.
        // If the map has the exact key, return the value.
        if (Array.isArray(matchOnMap[normalizedKey])) {
            return matchOnMap[normalizedKey];
        }
        // Strategy 2: Tree structure search (original logic).
        // Navigate the `matchOnMap` object following the path parts.
        const pathParts = normalizedKey.split('.').filter(part => part !== '');
        let current = matchOnMap;
        for (let i = 0; i < pathParts.length; i++) {
            const part = pathParts[i];
            if (current && current[part] !== undefined) {
                current = current[part];
            }
            else if (current && current.children && current.children[part] !== undefined) {
                current = current.children[part];
            }
            else {
                return undefined;
            }
            // If we reach the end of the path and find an object with `matchOn`, return it.
            if (i === pathParts.length - 1 && current && typeof current === 'object' && !Array.isArray(current) && current.matchOn) {
                return current.matchOn;
            }
        }
        // If at the end of navigation we find an array, that is the matchOn value.
        return Array.isArray(current) ? current : undefined;
    };
    // Get all unique paths present in both objects (original and modified)
    // to ensure we process all nodes, even those that have been deleted.
    const rutasUnificadas = getUnifiedPaths(original, modified);
    // Process each identified path.
    for (const pathInfo of rutasUnificadas) {
        processPath(pathInfo, original, modified, result, getMatchOnByName);
    }
    return result;
}
/**
 * Processes a specific path to determine the operation performed.
 * Compares the value in `original` and `modified` at that path and updates `result`.
 *
 * @param path The path to process (e.g., "a.b").
 * @param original The complete original object.
 * @param modified The complete modified object.
 * @param result The result object where changes will be written.
 * @param getMatchOnByName Function to get match fields.
 */
function processPath(pathInfo, original, modified, result, getMatchOnByName) {
    // Check flag at the beginning
    if (!pathInfo.procesar) {
        return;
    }
    // Get values at the current path for both objects.
    const originalValue = (0, utils_1.getByPath)(original, pathInfo.ruta);
    const modifiedValue = (0, utils_1.getByPath)(modified, pathInfo.ruta);
    let operation = 'none';
    // Determine the basic operation.
    if (originalValue === undefined && modifiedValue !== undefined) {
        operation = 'insert'; // Did not exist in original, exists in modified.
    }
    else if (originalValue !== undefined && modifiedValue === undefined) {
        operation = 'delete'; // Existed in original, does not exist in modified.
    }
    else if (Array.isArray(originalValue) && Array.isArray(modifiedValue)) {
        // If both are arrays, we need special logic.
        const matchFields = getMatchOnByName(pathInfo.ruta);
        // Check if it is an array of primitives (numbers, strings, etc.)
        const esArrayDePrimitivos = originalValue.length > 0 && typeof originalValue[0] !== 'object';
        // If we have match fields configured and it is NOT an array of primitives,
        // use intelligent array comparison.
        if (matchFields && !esArrayDePrimitivos) {
            // PASS path AND getMatchOnByName FOR RECURSION
            const nuevoArreglo = compareArrayWithMatch(originalValue, modifiedValue, matchFields);
            (0, utils_1.setByPath)(result, pathInfo.ruta, nuevoArreglo);
            return; // We finish here because compareArrayWithMatch already handles the entire array.
        }
        else if (!matchFields && !esArrayDePrimitivos) {
            // Array of objects without match fields - comparison by index
            const arrayConOp = [];
            const maxLength = Math.max(originalValue.length, modifiedValue.length);
            for (let i = 0; i < maxLength; i++) {
                const elemOrig = originalValue[i];
                const elemMod = modifiedValue[i];
                const message = `To ensure correct comparison of elements in the array "${pathInfo.ruta}", add match fields (matchFields) in the configuration`;
                if (elemOrig === undefined && elemMod !== undefined) {
                    // INSERT - new element
                    const element = { ...elemMod, _op: 'insert', _message: message };
                    arrayConOp.push(element);
                }
                else if (elemOrig !== undefined && elemMod === undefined) {
                    // DELETE - element deleted
                    const element = { ...elemOrig, _op: 'delete', _message: message };
                    arrayConOp.push(element);
                }
                else if (elemOrig !== undefined && elemMod !== undefined) {
                    // UPDATE or NONE - compare with diff
                    const diferencias = (0, microdiff_1.default)(elemOrig, elemMod, { shallow: true });
                    const operation = diferencias.length > 0 ? 'update' : 'none';
                    const element = { ...elemMod, _op: operation, _message: message };
                    arrayConOp.push(element);
                }
            }
            (0, utils_1.setByPath)(result, pathInfo.ruta, arrayConOp);
            return;
        }
        else {
            // If there are no matchFields or it is primitive, use standard diff (shallow).
            const diferencias = (0, microdiff_1.default)(originalValue, modifiedValue, { shallow: true });
            operation = diferencias.length > 0 ? 'update' : 'none';
            // Assign the operation to the array itself.
            // CREATE NEW ARRAY WITH _op
            const arrayConOp = [...modifiedValue];
            Object.assign(arrayConOp, { _op: operation });
            (0, utils_1.setByPath)(result, pathInfo.ruta, arrayConOp);
            return;
        }
    }
    else {
        // For other types (objects, primitives), use diff.
        const diferencias = (0, microdiff_1.default)(originalValue, modifiedValue, { shallow: true });
        operation = diferencias.length > 0 ? 'update' : 'none';
    }
    // If we reach here, mark the operation on the result object at that path.
    const resultPath = (0, utils_1.getByPath)(result, pathInfo.ruta);
    if (resultPath && typeof resultPath === 'object') {
        resultPath._op = operation;
        const existingMessage = resultPath._message;
        if (existingMessage) {
            resultPath._message = existingMessage;
        }
    }
}
/**
 * Compares two arrays using key fields to identify elements (instead of indices).
 * Handles insertions, updates, and deletions of elements.
 *
 * @param originalArr Original array.
 * @param modifiedArr Modified array.
 * @param matchFields Key fields to match elements (e.g. ['id']).
 * @param currentPath Current path in the object (for recursion).
 * @param getMatchOnByName Function to get match configuration in sub-levels.
 * @returns New array with elements marked with `_op`.
 */
function compareArrayWithMatch(originalArr, modifiedArr, matchFields) {
    const newArr = [];
    // 1. Process MODIFIED array elements (to detect updates and inserts)
    for (const elemMod of modifiedArr) {
        // Check if the element exists in the original using matchFields
        const elemOrig = findElement(originalArr, elemMod, matchFields);
        if (elemOrig) {
            // The element exists in both -> It is an UPDATE or NONE
            const element = { ...elemMod };
            const diferencias = (0, microdiff_1.default)(elemOrig, elemMod, { shallow: true });
            element._op = diferencias.length > 0 ? 'update' : 'none';
            newArr.push(element);
        }
        else {
            // Does not exist in original -> INSERT
            // It is a new element in the array
            const element = { ...elemMod };
            element._op = 'insert';
            markAllChildrenWithOp(element, 'insert'); // Mark all its children as inserted
            newArr.push(element);
        }
    }
    // 2. Process ORIGINAL array elements (to detect deletes)
    for (const elemOrig of originalArr) {
        const elemMod = findElement(modifiedArr, elemOrig, matchFields);
        if (!elemMod) {
            // Exists in original but not in modified -> DELETE
            // The element was deleted from the array
            const element = { ...elemOrig };
            element._op = 'delete';
            markAllChildrenWithOp(element, 'delete'); // Mark all its children as deleted
            newArr.push(element);
        }
    }
    return newArr;
}
/**
 * Recursively marks all children of an object with a specific operation.
 * Useful for marking the entire content of an inserted or deleted object.
 *
 * @param obj The object to mark.
 * @param op The operation to assign ('insert', 'delete').
 */
function markAllChildrenWithOp(obj, op) {
    for (const key in obj) {
        if (obj[key] && typeof obj[key] === 'object') {
            if (Array.isArray(obj[key])) {
                // For nested arrays, mark each element with the operation
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
                // For nested objects, assign _op and recurse
                if (obj[key]._op === undefined) {
                    obj[key]._op = op;
                }
                markAllChildrenWithOp(obj[key], op);
            }
        }
    }
}
/**
 * Searches for an element in an array that matches the specified key fields.
 *
 * @param arr Array to search in.
 * @param elemento Reference element (with values to search for).
 * @param matchFields List of fields that must match (e.g. ['id', 'codigo']).
 * @returns The found element or undefined.
 */
function findElement(arr, elemento, matchFields) {
    for (const field of matchFields) {
        const encontrado = arr.find(item => item[field] !== undefined &&
            elemento[field] !== undefined &&
            item[field] === elemento[field]);
        if (encontrado)
            return encontrado;
    }
    return undefined;
}
/**
 * Recursively traverses an object to get all paths to its nodes.
 * Identifies if each node is an array or object.
 *
 * @param obj Object to traverse.
 * @param prefix Accumulated prefix of the current path.
 * @returns Array of PathInfo objects with the path and type.
 */
function getComplexPathsWithType(obj, prefix = "") {
    const rutas = [];
    if (obj === null || obj === undefined) {
        return rutas;
    }
    if (Array.isArray(obj)) {
        rutas.push({
            ruta: prefix || "(root)",
            tipo: 'array',
            procesar: true
        });
        obj.forEach((item, index) => {
            if (item && typeof item === "object") {
                const arrayPath = `${prefix}[${index}]`;
                // Process children recursively
                rutas.push(...getComplexPathsWithType(item, arrayPath));
            }
        });
    }
    else if (obj && typeof obj === "object") {
        // ⚠️ **WHY IT IS MARKED AS DO NOT PROCESS:**
        // This path (e.g., 'arr[0]') represents an INDIVIDUAL ARRAY ELEMENT
        // If we process it, it would compare by INDEX (original.arr[0] vs modified.arr[0])
        // but elements might be in DIFFERENT ORDER, yielding incorrect results
        // Check with regex if it ends with [n]
        const esElementoArray = /\[\d+\]$/.test(prefix);
        rutas.push({
            ruta: prefix || "(root)",
            tipo: 'objeto',
            procesar: !esElementoArray
        });
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
/**
 * Gets a unified list of all paths present in the original and modified objects.
 * This ensures that paths existing in only one of them are not lost.
 *
 * @param original Original object.
 * @param modificado Modified object.
 * @returns List of PathInfo with all unique paths.
 */
function getUnifiedPaths(original, modificado) {
    const originalPaths = getComplexPathsWithType(original);
    const modifiedPaths = getComplexPathsWithType(modificado);
    // Start with the original paths
    const unifiedPaths = [...originalPaths];
    // Add modified paths that are not already present
    for (const rutaMod of modifiedPaths) {
        const existe = unifiedPaths.some(rutaOrig => rutaOrig.ruta === rutaMod.ruta);
        if (!existe) {
            unifiedPaths.push(rutaMod);
        }
    }
    return unifiedPaths;
}
//# sourceMappingURL=comparer.js.map