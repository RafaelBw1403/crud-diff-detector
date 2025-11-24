"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareObjects = compareObjects;
const microdiff_1 = __importDefault(require("microdiff"));
const utils_1 = require("./utils");
/**
 * Compara dos objetos (original y modificado) y devuelve una copia del objeto modificado
 * con una propiedad `_op` en cada nodo que indica la operación realizada ('insert', 'update', 'delete', 'none').
 *
 * @param original El objeto original.
 * @param modified El objeto modificado.
 * @param matchOnMap Un mapa que define qué campos usar para emparejar elementos en arrays.
 * @returns El objeto modificado con las marcas de operación `_op`.
 */
function compareObjects(original, modified, matchOnMap = {}) {
    // Creamos una copia profunda del objeto modificado para no mutar el original y trabajar sobre el resultado.
    const result = JSON.parse(JSON.stringify(modified));
    /**
     * Función auxiliar para obtener los campos de coincidencia (match fields) para una ruta dada.
     * Busca en el `matchOnMap` la configuración para la ruta especificada.
     *
     * @param fullPath La ruta completa del nodo (ej. "DatosProveedores[0].Representantes").
     * @returns Un array de strings con los nombres de los campos clave, o undefined si no se encuentra.
     */
    const getMatchOnByName = (fullPath) => {
        // Normalizar ruta: Elimina los índices de array para buscar en el mapa de configuración.
        // Ej: "DatosProveedores[0].Representantes" -> "DatosProveedores.Representantes"
        const normalizedKey = fullPath.replace(/\[\d+\]/g, '');
        // Estrategia 1: Búsqueda directa en el mapa plano.
        // Si el mapa tiene la clave exacta, devolvemos el valor.
        if (Array.isArray(matchOnMap[normalizedKey])) {
            return matchOnMap[normalizedKey];
        }
        // Estrategia 2: Búsqueda en estructura de árbol (lógica original).
        // Navega por el objeto `matchOnMap` siguiendo las partes de la ruta.
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
            // Si llegamos al final de la ruta y encontramos un objeto con `matchOn`, lo devolvemos.
            if (i === pathParts.length - 1 && current && typeof current === 'object' && !Array.isArray(current) && current.matchOn) {
                return current.matchOn;
            }
        }
        // Si al final de la navegación encontramos un array, ese es el valor de matchOn.
        return Array.isArray(current) ? current : undefined;
    };
    // Obtiene todas las rutas únicas presentes en ambos objetos (original y modificado)
    // para asegurar que procesamos todos los nodos, incluso los que han sido eliminados.
    const rutasUnificadas = getUnifiedPaths(original, modified);
    console.log("RUTAS UNIFICADAS :_ ", rutasUnificadas.flatMap((pathInfo) => pathInfo.ruta));
    // Procesamos cada ruta identificada.
    for (const pathInfo of rutasUnificadas) {
        processPath(pathInfo, original, modified, result, getMatchOnByName);
    }
    return result;
}
/**
 * Procesa una ruta específica para determinar la operación realizada.
 * Compara el valor en `original` y `modified` en esa ruta y actualiza `result`.
 *
 * @param path La ruta a procesar (ej. "a.b").
 * @param original El objeto original completo.
 * @param modified El objeto modificado completo.
 * @param result El objeto resultado donde se escribirán los cambios.
 * @param getMatchOnByName Función para obtener los campos de coincidencia.
 */
function processPath(pathInfo, original, modified, result, getMatchOnByName) {
    // Verificar flag al inicio
    if (!pathInfo.procesar) {
        console.log(`⏭️  Skipeando ${pathInfo.ruta}`);
        return;
    }
    // Obtenemos los valores en la ruta actual para ambos objetos.
    const originalValue = (0, utils_1.getByPath)(original, pathInfo.ruta);
    const modifiedValue = (0, utils_1.getByPath)(modified, pathInfo.ruta);
    let operation = 'none';
    // Determinamos la operación básica.
    if (originalValue === undefined && modifiedValue !== undefined) {
        operation = 'insert'; // No existía en original, existe en modificado.
    }
    else if (originalValue !== undefined && modifiedValue === undefined) {
        operation = 'delete'; // Existía en original, no existe en modificado.
    }
    else if (Array.isArray(originalValue) && Array.isArray(modifiedValue)) {
        // Si ambos son arrays, necesitamos una lógica especial.
        const matchFields = getMatchOnByName(pathInfo.ruta);
        console.log("MATCH FIELDS :_ ", matchFields);
        // Verificamos si es un array de primitivos (números, strings, etc.)
        const esArrayDePrimitivos = originalValue.length > 0 && typeof originalValue[0] !== 'object';
        // Si tenemos campos de coincidencia configurados y NO es un array de primitivos,
        // usamos la comparación inteligente de arrays.
        if (matchFields && !esArrayDePrimitivos) {
            // PASAMOS path Y getMatchOnByName PARA LA RECURSIVIDAD
            const nuevoArreglo = compareArrayWithMatch(originalValue, modifiedValue, matchFields);
            (0, utils_1.setByPath)(result, pathInfo.ruta, nuevoArreglo);
            return; // Terminamos aquí porque compareArrayWithMatch ya maneja todo el array.
        }
        else if (!matchFields && !esArrayDePrimitivos) {
            // Array de objetos sin campos de coincidencia - comparación por índice
            const arrayConOp = [];
            const maxLength = Math.max(originalValue.length, modifiedValue.length);
            for (let i = 0; i < maxLength; i++) {
                const elemOrig = originalValue[i];
                const elemMod = modifiedValue[i];
                const message = `Para asegurar una comparación correcta de elementos en el array "${pathInfo.ruta}", agregue los campos de coincidencia (matchFields) en la configuración`;
                if (elemOrig === undefined && elemMod !== undefined) {
                    // INSERT - elemento nuevo
                    const element = { ...elemMod, _op: 'insert', _message: message };
                    arrayConOp.push(element);
                }
                else if (elemOrig !== undefined && elemMod === undefined) {
                    // DELETE - elemento eliminado
                    const element = { ...elemOrig, _op: 'delete', _message: message };
                    arrayConOp.push(element);
                }
                else if (elemOrig !== undefined && elemMod !== undefined) {
                    // UPDATE o NONE - comparar con diff
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
            // Si no hay matchFields o es primitivo, usamos diff estándar (shallow).
            const diferencias = (0, microdiff_1.default)(originalValue, modifiedValue, { shallow: true });
            console.log("DIFERENCIAS :_ ", diferencias);
            operation = diferencias.length > 0 ? 'update' : 'none';
            // Asignamos la operación al array mismo.
            // CREAR NUEVO ARRAY CON _op
            const arrayConOp = [...modifiedValue];
            Object.assign(arrayConOp, { _op: operation });
            (0, utils_1.setByPath)(result, pathInfo.ruta, arrayConOp);
            return;
        }
    }
    else {
        // Para otros tipos (objetos, primitivos), usamos diff.
        const diferencias = (0, microdiff_1.default)(originalValue, modifiedValue, { shallow: true });
        operation = diferencias.length > 0 ? 'update' : 'none';
    }
    // Si llegamos aquí, marcamos la operación en el objeto resultado en esa ruta.
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
 * Compara dos arrays usando campos clave para identificar elementos (en lugar de índices).
 * Maneja inserciones, actualizaciones y eliminaciones de elementos.
 *
 * @param originalArr Array original.
 * @param modifiedArr Array modificado.
 * @param matchFields Campos clave para emparejar elementos (ej. ['id']).
 * @param currentPath Ruta actual en el objeto (para recursividad).
 * @param getMatchOnByName Función para obtener configuración de match en sub-niveles.
 * @returns Nuevo array con los elementos marcados con `_op`.
 */
function compareArrayWithMatch(originalArr, modifiedArr, matchFields) {
    const newArr = [];
    // 1. Procesar elementos del array MODIFICADO (para detectar updates e inserts)
    for (const elemMod of modifiedArr) {
        // Buscamos si el elemento existe en el original usando los matchFields
        const elemOrig = findElement(originalArr, elemMod, matchFields);
        if (elemOrig) {
            // El elemento existe en ambos -> Es un UPDATE o NONE
            const element = { ...elemMod };
            const diferencias = (0, microdiff_1.default)(elemOrig, elemMod, { shallow: true });
            element._op = diferencias.length > 0 ? 'update' : 'none';
            newArr.push(element);
        }
        else {
            // No existe en original → INSERT
            // Es un elemento nuevo en el array
            const element = { ...elemMod };
            element._op = 'insert';
            markAllChildrenWithOp(element, 'insert'); // Marcamos todos sus hijos como insertados
            newArr.push(element);
        }
    }
    // 2. Procesar elementos del array ORIGINAL (para detectar deletes)
    for (const elemOrig of originalArr) {
        const elemMod = findElement(modifiedArr, elemOrig, matchFields);
        if (!elemMod) {
            // Existe en original pero no en modificado → DELETE
            // El elemento fue eliminado del array
            const element = { ...elemOrig };
            element._op = 'delete';
            markAllChildrenWithOp(element, 'delete'); // Marcamos todos sus hijos como eliminados
            newArr.push(element);
        }
    }
    return newArr;
}
/**
 * Marca recursivamente todos los hijos de un objeto con una operación específica.
 * Útil para marcar todo el contenido de un objeto insertado o eliminado.
 *
 * @param obj El objeto a marcar.
 * @param op La operación a asignar ('insert', 'delete').
 */
function markAllChildrenWithOp(obj, op) {
    for (const key in obj) {
        if (obj[key] && typeof obj[key] === 'object') {
            if (Array.isArray(obj[key])) {
                // Para arrays anidados, marcar cada elemento con la operación
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
                // Para objetos anidados, asignar _op y recursar
                if (obj[key]._op === undefined) {
                    obj[key]._op = op;
                }
                markAllChildrenWithOp(obj[key], op);
            }
        }
    }
}
/**
 * Busca un elemento en un array que coincida con los campos clave especificados.
 *
 * @param arr Array donde buscar.
 * @param elemento Elemento de referencia (con los valores a buscar).
 * @param matchFields Lista de campos que deben coincidir (ej. ['id', 'codigo']).
 * @returns El elemento encontrado o undefined.
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
 * Recorre recursivamente un objeto para obtener todas las rutas (paths) a sus nodos.
 * Identifica si cada nodo es un array u objeto.
 *
 * @param obj Objeto a recorrer.
 * @param prefix Prefijo acumulado de la ruta actual.
 * @returns Array de objetos PathInfo con la ruta y el tipo.
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
                // Procesar hijos recursivamente
                rutas.push(...getComplexPathsWithType(item, arrayPath));
            }
        });
    }
    else if (obj && typeof obj === "object") {
        // ⚠️ **POR QUÉ SE MARCA COMO NO PROCESAR:**
        // Este path (ej: 'Contactos[0]') representa un ELEMENTO INDIVIDUAL de array
        // Si lo procesamos, haría comparación por ÍNDICE (Contactos[0] vs Contactos[0])
        // pero los elementos pueden estar en DIFERENTE ORDEN, dando resultados incorrectos
        // Verificar con regex si termina con [n]
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
 * Obtiene una lista unificada de todas las rutas presentes en el objeto original y el modificado.
 * Esto asegura que no se pierdan rutas que solo existen en uno de los dos.
 *
 * @param original Objeto original.
 * @param modificado Objeto modificado.
 * @returns Lista de PathInfo con todas las rutas únicas.
 */
function getUnifiedPaths(original, modificado) {
    const originalPaths = getComplexPathsWithType(original);
    const modifiedPaths = getComplexPathsWithType(modificado);
    // Comenzamos con las rutas del original
    const unifiedPaths = [...originalPaths];
    // Agregamos las rutas del modificado que no estén ya
    for (const rutaMod of modifiedPaths) {
        const existe = unifiedPaths.some(rutaOrig => rutaOrig.ruta === rutaMod.ruta);
        if (!existe) {
            unifiedPaths.push(rutaMod);
        }
    }
    return unifiedPaths;
}
//# sourceMappingURL=comparer.js.map