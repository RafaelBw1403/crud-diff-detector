# object-crud-diff 🎯

A lightweight TypeScript library to detect CRUD operations (insert, update, delete, none) between JavaScript objects with smart array matching.

## Features

- **🔍 Smart Comparison**: Detects inserts, updates, deletes, and no-changes
- **🧩 Array Matching**: Intelligent array comparison using configurable fields
- **🏷 TypeScript Native**: Full TypeScript support with typed results
- **🚀 Lightweight**: Zero dependencies (except microdiff)
- **⚙️ Configurable**: Customizable matching fields for different array types

## Installation

```bash
npm install object-crud-diff
```

## Quick Start
```typescript
import { compareObjects } from 'object-crud-diff';

const original = {
  id: 1,
  users: [
    { id: 1, name: 'John' },
    { id: 2, name: 'Jane' }
  ]
};

const modified = {
  id: 1,
  users: [
    { id: 1, name: 'John Doe' }, // updated
    { id: 3, name: 'Bob' }       // new
    // Jane deleted
  ]
};

const matchOnMap = {
  'users': ['id'] // Match users by 'id' field
};

const result = compareObjects(original, modified, matchOnMap);

console.log(result.users);
// [
//   { id: 1, name: 'John Doe', _op: 'update' },
//   { id: 3, name: 'Bob', _op: 'insert' },
//   { id: 2, name: 'Jane', _op: 'delete' }
// ]
```

## API
```typescript
compareObjects(original, modified, matchOnMap?)
```

### Parameters
- original: Original object
- modified: Modified object to compare against
- matchOnMap: Optional configuration for array matching

### Returns
The modified object with _op properties indicating the operation:

- 'insert': New element
- 'update': Modified element
- 'delete': Removed element
- 'none': No changes

### MatchOnMap Configuration
Define how to match elements in arrays:

```typescript
const matchOnMap = {
  'users': ['id'],           // Match by single field
  'products': ['id', 'sku'], // Match by multiple fields
  'tags': []                 // No matching - direct comparison
};
```

### Examples
Basic Object Comparison
```typescript
const original = { name: 'John', age: 30 };
const modified = { name: 'John', age: 31 };

const result = compareObjects(original, modified);
// { name: 'John', age: 31, _op: 'update' }
```

### Nested Objects
```typescript
const original = {
  profile: {
    personal: { name: 'John', age: 30 }
  }
};

const modified = {
  profile: {
    personal: { name: 'John', age: 31 }
  }
};

const result = compareObjects(original, modified);
// profile.personal.age has _op: 'update'
```

### Array Operations
```typescript
const matchOnMap = {
  'items': ['id'],
  'features': [] // Primitive array
};

const result = compareObjects(original, modified, matchOnMap);
// items will have individual _op operations
// features array will have _op on the array itself
```

### Types
```typescript
type CrudOperation = 'insert' | 'update' | 'delete' | 'none';

interface MatchOnMap {
  [arrayName: string]: string[];
}
```

### Use Cases
Audit Logs: Track changes between object states

Data Sync: Detect what needs to be synced

Undo/Redo: Track operations for history

Form Validation: Detect dirty fields

API Optimization: Send only changed data

## License
MIT
