# CRUD Diff Detector 🎯

A lightweight TypeScript library to detect CRUD operations (insert, update, delete, no change) between JavaScript objects with intelligent array matching.

## ✨ Key Features

- **🔍 Smart Comparison**: Detects insertions, updates, deletions, and no changes
- **🧩 Array Matching**: Intelligent comparison using configurable fields
- **🌊 Deep Nesting**: Support for nested objects and arrays with full path configuration
- **🚀 Lightweight**: Zero dependencies (except microdiff)
- **⚙️ Configurable**: Customizable matching fields for different array types

## 🚀 Installation

```bash
npm install crud-diff-detector
```

## 💡 Why use this library?

When you need to compare complex objects with arrays, traditional solutions fail to correctly identify which elements were added, modified, or removed. This library solves that problem:

```typescript
// ❌ Traditional diff - doesn't work well with arrays
JSON.stringify(original) === JSON.stringify(modified) // False positive/negative

// ✅ CRUD Diff Detector - identifies exact changes
const result = compareObjects(original, modified, matchConfig)
// Each element has _op: 'insert' | 'update' | 'delete' | 'none'
```

## 🎯 Quick Start

```typescript
import { compareObjects } from 'crud-diff-detector';

// Original object
const original = {
  id: 1,
  users: [
    { id: 1, name: 'John', email: 'john@example.com' },
    { id: 2, name: 'Jane', email: 'jane@example.com' }
  ],
  orders: [
    { orderId: 'A1', status: 'pending', total: 100 },
    { orderId: 'A2', status: 'completed', total: 200 }
  ]
};

// Modified object
const modified = {
  id: 1, // no change
  users: [
    { id: 1, name: 'John Doe', email: 'john@example.com' }, // name updated
    { id: 3, name: 'Bob', email: 'bob@example.com' }        // new user
    // Jane was deleted
  ],
  orders: [
    { orderId: 'A1', status: 'shipped', total: 100 }, // status updated
    { orderId: 'A3', status: 'pending', total: 300 }  // new order
    // A2 was deleted
  ]
};

// Match configuration
const matchOnMap = {
  'users': ['id'],        // Match users by 'id' field
  'orders': ['orderId']   // Match orders by 'orderId' field
};

const result = compareObjects(original, modified, matchOnMap);

console.log(result.users);
// [
//   { id: 1, name: 'John Doe', email: 'john@example.com', _op: 'update' },
//   { id: 3, name: 'Bob', email: 'bob@example.com', _op: 'insert' },
//   { id: 2, name: 'Jane', email: 'jane@example.com', _op: 'delete' }
// ]

console.log(result.orders);
// [
//   { orderId: 'A1', status: 'shipped', total: 100, _op: 'update' },
//   { orderId: 'A3', status: 'pending', total: 300, _op: 'insert' },
//   { orderId: 'A2', status: 'completed', total: 200, _op: 'delete' }
// ]
```

## ⚙️ Advanced MatchOnMap Configuration

### Full Path Structure
```typescript
const matchOnMap = {
  'users': ['id'],                           // Match by one field
  'products': ['id', 'sku'],                 // Match by multiple fields
  'categories': ['code'],                    // Match by different field
  'tags': [],                                // No match - direct comparison
  'customers.orders': ['orderId'],           // Orders within customers
  'customers.orders.items': ['productId'],   // Items within orders
  'customers.addresses': ['addressId']       // Addresses within customers
};
```

### Complete Example with Nesting

```typescript
const original = {
  customers: [
    {
      customerId: 'C1',
      name: 'John Doe',
      orders: [
        {
          orderId: 'O1',
          date: '2024-01-01',
          items: [
            { productId: 'P1', quantity: 2, price: 10 },
            { productId: 'P2', quantity: 1, price: 20 }
          ]
        }
      ],
      addresses: [
        { addressId: 'A1', city: 'New York', zip: '10001' }
      ]
    }
  ]
};

const modified = {
  customers: [
    {
      customerId: 'C1',
      name: 'John Smith', // updated
      orders: [
        {
          orderId: 'O1',
          date: '2024-01-01',
          items: [
            { productId: 'P1', quantity: 3, price: 10 }, // quantity updated
            { productId: 'P3', quantity: 1, price: 15 }  // new product
            // P2 deleted
          ]
        },
        {
          orderId: 'O2', // new order
          date: '2024-01-02',
          items: [
            { productId: 'P4', quantity: 1, price: 25 }
          ]
        }
      ],
      addresses: [
        { addressId: 'A1', city: 'New York', zip: '10001' }, // no change
        { addressId: 'A2', city: 'Boston', zip: '02101' }    // new address
      ]
    }
  ]
};

// Configuration with full paths
const matchOnMap = {
  'customers': ['customerId'],
  'customers.orders': ['orderId'],
  'customers.orders.items': ['productId'],
  'customers.addresses': ['addressId']
};

const result = compareObjects(original, modified, matchOnMap);

// Result will include:
// - customers[0]._op = 'update' (name changed)
// - customers[0].orders[0]._op = 'update' (items changed)
// - customers[0].orders[0].items[0]._op = 'update' (quantity changed)
// - customers[0].orders[0].items[1]._op = 'insert' (new product)
// - customers[0].orders[1]._op = 'insert' (new order)
// - customers[0].addresses[1]._op = 'insert' (new address)
```

## 📊 CRUD Operations

### `insert`
New elements that did not exist in the original object.

```typescript
{ id: 3, name: 'New User', _op: 'insert' }
```

### `update`
Existing elements that were modified.

```typescript
{ id: 1, name: 'Updated Name', _op: 'update' }
```

### `delete`
Elements that existed in the original but were removed.

```typescript
{ id: 2, name: 'Deleted User', _op: 'delete' }
```

### `none`
Elements that underwent no changes.

```typescript
{ id: 1, name: 'Same Name', _op: 'none' }
```

## 🔧 API

### `compareObjects(original, modified, matchOnMap?)`

#### Parameters
- `original`: Original object
- `modified`: Modified object to compare
- `matchOnMap`: Optional configuration for array matching

#### Returns
The modified object with `_op` properties indicating the operation on each node.

## 🎪 Use Cases

### Change Audit
```typescript
const auditLog = compareObjects(beforeState, afterState, matchConfig);
// Generates detailed log of all changes
```

### Data Synchronization
```typescript
const changes = compareObjects(localData, serverData, matchConfig);
// Sends only changes to the server
api.sync(changes);
```

### Undo/Redo History
```typescript
const operations = compareObjects(previousState, currentState, matchConfig);
// Stores operations for undo/redo functionality
```

### Form Validation
```typescript
const dirtyFields = compareObjects(initialData, formData, matchConfig);
// Detects which fields were modified
```

## 💡 Best Practices

1. **Always use unique fields** for `matchOn` (IDs, codes, etc.)
2. **Use full paths** for nested arrays: `'parent.child.grandchild'`
3. **Configure all arrays** that need intelligent matching
4. **Handle arrays of primitives** by omitting them from the map for direct comparison
5. **Array indices are automatically normalized**: `customers[0].orders` → `customers.orders`

## 🚨 Considerations

- Deleted elements appear in the result with `_op: 'delete'`
- The library performs a deep copy of the modified object
- The `_op` marking propagates recursively in insertions/deletions
- Paths in `matchOnMap` must use dots without indices: `customers.orders` not `customers[0].orders`

## 📄 License

MIT