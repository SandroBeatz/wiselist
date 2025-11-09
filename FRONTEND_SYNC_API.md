# 📘 Frontend Sync API - Quick Guide

## Endpoint

```
POST http://localhost:3000/api/lists/sync
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

---

## TypeScript Types

```typescript
enum OperationType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

type ListType = 'SHOPPING' | 'TODO' | 'OTHER';

interface SyncRequest {
  listOperations: ListOperation[];
  itemOperations: ListItemOperation[];
  lastSyncTimestamp?: number;  // Для инкрементального sync
}

interface SyncResponse {
  lists: List[];                // Все доступные списки
  items: ListItem[];            // Все элементы
  conflicts: {
    listIds: string[];          // ID списков с конфликтами
    itemIds: string[];          // ID элементов с конфликтами
  };
  serverTimestamp: number;      // Сохранить для следующего sync
}

interface ListOperation {
  id: string;                   // UUID списка
  type: OperationType;
  version: number;              // Версия из локальной БД
  timestamp: number;            // Date.now()
  data?: {                      // Только для CREATE/UPDATE
    title?: string;
    type?: ListType;
  };
}

interface ListItemOperation {
  id: string;
  listId: string;
  type: OperationType;
  version: number;
  timestamp: number;
  data?: {
    content?: string;
    checked?: boolean;
  };
}
```

---

## Quick Start Examples

### 1. Initial Sync (получить все списки)

```typescript
const response = await fetch('http://localhost:3000/api/lists/sync', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    listOperations: [],
    itemOperations: [],
  }),
});

const data = await response.json();
// Сохранить для следующего sync
localStorage.setItem('lastSync', data.serverTimestamp);
```

### 2. Create List

```typescript
const listId = crypto.randomUUID();

await fetch('http://localhost:3000/api/lists/sync', {
  method: 'POST',
  headers: { /* ... */ },
  body: JSON.stringify({
    listOperations: [{
      id: listId,
      type: 'CREATE',
      version: 0,              // Новые объекты всегда 0
      timestamp: Date.now(),
      data: {
        title: 'Shopping List',
        type: 'SHOPPING'
      }
    }],
    itemOperations: [],
  }),
});
```

### 3. Update List

```typescript
// currentVersion - из локальной БД
const currentVersion = 2;

await fetch('http://localhost:3000/api/lists/sync', {
  method: 'POST',
  headers: { /* ... */ },
  body: JSON.stringify({
    listOperations: [{
      id: 'list-uuid',
      type: 'UPDATE',
      version: currentVersion,  // ⚠️ ВАЖНО: текущая версия
      timestamp: Date.now(),
      data: { title: 'New Title' }
    }],
    itemOperations: [],
  }),
});
```

### 4. Add Items to List

```typescript
await fetch('http://localhost:3000/api/lists/sync', {
  method: 'POST',
  headers: { /* ... */ },
  body: JSON.stringify({
    listOperations: [],
    itemOperations: [
      {
        id: crypto.randomUUID(),
        listId: 'list-uuid',
        type: 'CREATE',
        version: 0,
        timestamp: Date.now(),
        data: { content: 'Milk', checked: false }
      },
      {
        id: crypto.randomUUID(),
        listId: 'list-uuid',
        type: 'CREATE',
        version: 0,
        timestamp: Date.now(),
        data: { content: 'Bread', checked: false }
      }
    ],
  }),
});
```

### 5. Incremental Sync (периодическая синхронизация)

```typescript
const lastSync = localStorage.getItem('lastSync');
const pendingOps = await getPendingOperationsFromIndexedDB();

const response = await fetch('http://localhost:3000/api/lists/sync', {
  method: 'POST',
  headers: { /* ... */ },
  body: JSON.stringify({
    listOperations: pendingOps.lists,
    itemOperations: pendingOps.items,
    lastSyncTimestamp: lastSync ? parseInt(lastSync) : undefined,
  }),
});

const data = await response.json();

// Обработать конфликты (см. ниже)
handleConflicts(data.conflicts);

// Обновить локальную БД
await updateLocalDB(data.lists, data.items);

// Сохранить новый timestamp
localStorage.setItem('lastSync', data.serverTimestamp);
```

---

## Conflict Resolution

Сервер использует **Last-Write-Wins** (LWW):
- Если `conflicts.listIds` содержит ID → клиент проиграл
- В `response.lists` уже актуальная версия с сервера
- Нужно обновить локальную БД версией с сервера

```typescript
function handleConflicts(conflicts: { listIds: string[], itemIds: string[] }) {
  if (conflicts.listIds.length > 0) {
    console.warn('List conflicts:', conflicts.listIds);
    // data.lists содержит актуальные версии - обновить локальную БД
  }

  if (conflicts.itemIds.length > 0) {
    console.warn('Item conflicts:', conflicts.itemIds);
    // data.items содержит актуальные версии - обновить локальную БД
  }
}
```

**⚠️ Важно:** После конфликта обновить **version** в локальной БД!

---

## Limits & Errors

### Rate Limiting
- **Лимит:** 10 sync в минуту
- **Ответ:** HTTP 429 Too Many Requests

```typescript
if (response.status === 429) {
  console.error('Rate limit exceeded, retry in 60 seconds');
}
```

### Max Operations
- **Лимит:** 1000 операций на запрос
- **Ответ:** HTTP 400 Bad Request

```typescript
// Разбивайте большие sync на несколько запросов
if (operations.length > 1000) {
  // chunk operations
}
```

### Authentication
- **Ответ:** HTTP 401 Unauthorized
```typescript
if (response.status === 401) {
  // Redirect to login
}
```

### Access Denied
- **Ответ:** HTTP 403 Forbidden
```typescript
if (response.status === 403) {
  // User doesn't have access to this list
}
```

---

## Best Practices

### 1. Version Management
```typescript
// ✅ ВСЕГДА храните version вместе с данными
interface LocalList {
  id: string;
  title: string;
  version: number;  // ⚠️ КРИТИЧНО!
  // ...
}

// При UPDATE используйте актуальный version
await updateList(list.id, list.version, newTitle);
```

### 2. Offline Queue
```typescript
// Сохраняйте операции в IndexedDB при offline
class SyncQueue {
  async addOperation(op) {
    await saveToIndexedDB(op);
    if (navigator.onLine) {
      await this.sync();
    }
  }
}
```

### 3. Auto Sync
```typescript
// Периодический sync каждые 30 сек
setInterval(() => {
  if (navigator.onLine) incrementalSync();
}, 30000);

// Sync при восстановлении соединения
window.addEventListener('online', () => incrementalSync());
```

### 4. Optimistic UI
```typescript
// 1. Сразу обновить UI
updateUI(newData);

// 2. Добавить в queue
await syncQueue.add(operation);

// 3. Sync произойдет автоматически
// Если конфликт - UI обновится версией с сервера
```

---

## Complete Example

```typescript
async function createShoppingList() {
  const listId = crypto.randomUUID();
  const itemIds = [crypto.randomUUID(), crypto.randomUUID()];

  try {
    const response = await fetch('http://localhost:3000/api/lists/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        listOperations: [{
          id: listId,
          type: 'CREATE',
          version: 0,
          timestamp: Date.now(),
          data: { title: 'Groceries', type: 'SHOPPING' }
        }],
        itemOperations: [
          {
            id: itemIds[0],
            listId,
            type: 'CREATE',
            version: 0,
            timestamp: Date.now(),
            data: { content: 'Milk', checked: false }
          },
          {
            id: itemIds[1],
            listId,
            type: 'CREATE',
            version: 0,
            timestamp: Date.now(),
            data: { content: 'Bread', checked: false }
          }
        ],
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();

    // Сохранить timestamp
    localStorage.setItem('lastSync', data.serverTimestamp);

    // Обновить локальную БД
    await updateLocalDB(data.lists, data.items);

    return data;
  } catch (error) {
    console.error('Sync failed:', error);
    // Операции остаются в offline queue
  }
}
```

---

## Swagger UI

Интерактивная документация и тестирование:
```
http://localhost:3000/api/docs
```

---

**✅ Готово к использованию!**
