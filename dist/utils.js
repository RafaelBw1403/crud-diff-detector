"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setByPath = exports.getByPath = void 0;
const getByPath = (obj, path) => {
    if (path === "(root)") {
        return obj;
    }
    return path
        .replace(/\[(\d+)\]/g, '.$1') // convert [0] to .0
        .split('.')
        .reduce((acc, key) => (acc ? acc[key] : undefined), obj);
};
exports.getByPath = getByPath;
const setByPath = (obj, path, value) => {
    const part = path.replace(/\[(\d+)\]/g, '.$1').split('.');
    let current = obj;
    for (let i = 0; i < part.length - 1; i++) {
        const parte = part[i];
        if (!current[parte])
            return;
        current = current[parte];
    }
    const last = part[part.length - 1];
    current[last] = value;
};
exports.setByPath = setByPath;
