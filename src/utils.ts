export const getByPath = (obj: any, path: string): any => {
    if (path === "(root)") {
        return obj;
    }
    return path
        .replace(/\[(\d+)\]/g, '.$1') // convert [0] to .0
        .split('.')
        .reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

export const setByPath = (obj: any, path: string, value: any): void => {
    const part = path.replace(/\[(\d+)\]/g, '.$1').split('.');
    let current = obj;
    
    for (let i = 0; i < part.length - 1; i++) {
        const parte = part[i];
        if (!current[parte]) return;
        current = current[parte];
    }
    
    const last = part[part.length - 1];
    current[last] = value;
}
