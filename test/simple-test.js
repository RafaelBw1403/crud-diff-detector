const { compareObjects } = require('../dist/index.js');
const { originalCar, modifiedCar } = require('./data.js');

// Función simple de testing
function test(label, fn) {
    try {
        fn();
        console.log(`✅ ${label}`);
    } catch (error) {
        console.log(`❌ ${label}: ${error.message}`);
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

// Datos de prueba - Objeto Car

// MatchOnMap para testing
const carMatchOnMap = {
    'owners': ['id'],
    'features': [] // Sin match fields - comparación directa
};

console.log('🚗 TESTING OBJECT-CRUD-DIFF\n');

// Test 1: Sin MatchOnMap
test('Sin MatchOnMap - detecta cambios en raíz', () => {
    const result = compareObjects(originalCar, modifiedCar);
    assert(result.Operacion === 'update', 'Raíz debería ser update');
});

test('Sin MatchOnMap - detecta cambios en propiedades', () => {
    const result = compareObjects(originalCar, modifiedCar);
    assert(result.model.Operacion === 'update', 'Modelo debería ser update');
    assert(result.specifications.Operacion === 'update', 'Specs debería ser update');
});

// Test 2: Con MatchOnMap
test('Con MatchOnMap - detecta operaciones CRUD en arrays', () => {
    const result = compareObjects(originalCar, modifiedCar, carMatchOnMap);

    console.log(result);
    
    const owners = result.owners;
    
    // John - update (cambió nombre)
    const john = owners.find(o => o.id === 1);
    assert(john.Operacion === 'update', 'John debería ser update');
    
    // Jane - delete (eliminada)
    const jane = owners.find(o => o.id === 2);
    assert(jane.Operacion === 'delete', 'Jane debería ser delete');
    
    // Bob - insert (nuevo)
    const bob = owners.find(o => o.id === 3);
    assert(bob.Operacion === 'insert', 'Bob debería ser insert');
});

// Test 3: Array sin match fields
test('Array sin match fields - comparación directa', () => {
    const result = compareObjects(originalCar, modifiedCar, carMatchOnMap);
    assert(result.features.Operacion === 'update', 'Features debería ser update (cambió longitud)');
});

// Test 4: Objetos anidados
test('Objetos anidados - detecta cambios', () => {
    const result = compareObjects(originalCar, modifiedCar);
    assert(result.specifications.fuel.Operacion === 'update', 'Fuel debería ser update');
});

console.log('\n📊 RESUMEN:');
console.log('• Sin MatchOnMap: Comparación superficial, solo detecta update/none');
console.log('• Con MatchOnMap: Detección inteligente de insert/update/delete en arrays');
console.log('• Arrays sin match fields: Comparación directa por referencia');