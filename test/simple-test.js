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

// MatchOnMap para testing
const carMatchOnMap = {
    'owners': ['id'],
    'features': [],
    'maintenance': {
        matchOn: ['id'],
        children: {
            'parts': ['id']
        }
    }
};

console.log('🚗 TESTING OBJECT COMPARISON WITH CRUD OPERATIONS\n');

// Test principal
test('Comparación completa con MatchOnMap jerárquico', () => {
    const result = compareObjects(originalCar, modifiedCar, carMatchOnMap);
    
    console.log('\n📋 RESULTADO DE LA COMPARACIÓN:');
    console.log(JSON.stringify(result, null, 2));
    
    // 1. Verificar cambios en owners
    console.log('\n👥 VERIFICANDO OWNERS:');
    const owners = result.owners;
    
    const john = owners.find(o => o.id === 1);
    console.log(`- John (id:1): ${john._op}`);
    assert(john._op === 'update', 'John debería ser UPDATE (cambió nombre)');
    
    const jane = owners.find(o => o.id === 2);
    console.log(`- Jane (id:2): ${jane._op}`);
    assert(jane._op === 'delete', 'Jane debería ser DELETE (fue eliminada)');
    
    const bob = owners.find(o => o.id === 3);
    console.log(`- Bob (id:3): ${bob._op}`);
    assert(bob._op === 'insert', 'Bob debería ser INSERT (nuevo owner)');
    
    // 2. Verificar cambios en maintenance
    console.log('\n🔧 VERIFICANDO MAINTENANCE:');
    const maintenance = result.maintenance;
    
    maintenance.forEach((item, index) => {
        console.log(`- Maintenance ${index} (id:${item.id}): ${item._op}`);
    });
    
    // 3. Verificar cambios en parts dentro de maintenance
    console.log('\n🛠️ VERIFICANDO PARTS DENTRO DE MAINTENANCE:');
    
    maintenance.forEach((maintenanceItem, maintIndex) => {
        if (maintenanceItem.parts) {
            console.log(`\n  Maintenance ${maintIndex} - Parts:`);
            maintenanceItem.parts.forEach((part, partIndex) => {
                console.log(`    - Part ${partIndex} (id:${part.id}): ${part._op}`);
            });
        }
    });
    
    // 4. Verificar cambios en features
    console.log('\n⭐ VERIFICANDO FEATURES:');
    console.log(`- Features: ${result.features._op}`);
    
    // 5. Verificar cambios en propiedades simples
    console.log('\n📝 VERIFICANDO PROPIEDADES SIMPLES:');
    console.log(`- Model: ${result.model._op}`);
    console.log(`- Specifications: ${result.specifications._op}`);
    console.log(`- Fuel: ${result.specifications.fuel._op}`);
});

console.log('\n🎯 RESUMEN DE PRUEBAS:');
console.log('• Owners: CRUD individual (insert/update/delete)');
console.log('• Maintenance: CRUD con hijos anidados');
console.log('• Parts: CRUD dentro de maintenance (2 niveles)');
console.log('• Features: Comparación directa de array');
console.log('• Propiedades simples: Detección de cambios');