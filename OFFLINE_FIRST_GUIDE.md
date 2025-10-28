# 🚀 Offline-First Architecture Guide with RxJS

## Оглавление

- [Введение](#введение)
- [Архитектура](#архитектура)
- [Ключевые концепции](#ключевые-концепции)
- [Frontend Implementation](#frontend-implementation)
  - [Database Layer (Dexie)](#database-layer-dexie)
  - [RxJS Service Layer](#rxjs-service-layer)
  - [Sync Engine](#sync-engine)
  - [Vue Composables](#vue-composables)
  - [UI Components](#ui-components)
- [Operational Transform](#operational-transform)
- [Testing](#testing)
- [Migration Plan](#migration-plan)
- [Best Practices](#best-practices)

---

## Введение

Этот документ описывает имплементацию **offline-first архитектуры** для Wiselist приложения с использованием **RxJS**, **IndexedDB (Dexie)** и **Operational Transform** для разрешения конфликтов.

### Цели

- ✅ **Мгновенный UI**: все операции выполняются локально без ожидания сервера
- ✅ **Работа offline**: полный функционал без интернета
- ✅ **Автоматическая синхронизация**: прозрачная синхронизация при восстановлении связи
- ✅ **Разрешение конфликтов**: умная обработка конфликтов при совместной работе
- ✅ **Надежность**: очередь операций с retry механизмом

### Стек технологий

**Frontend:**
- RxJS v7.8.2 - реактивные потоки данных
- Dexie v4.2.1 - IndexedDB wrapper
- Vue 3 Composition API - UI layer
- Axios - HTTP client

**Backend:**
- NestJS - REST API
- Prisma - ORM
- PostgreSQL - основная БД

---

## Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                         Vue Components                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐│
│  │  Lists Page     │  │  List Detail    │  │ Sync Status  ││
│  └────────┬────────┘  └────────┬────────┘  └──────┬───────┘│
└───────────┼────────────────────┼────────────────────┼────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                      Vue Composables                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  useListsRx()  │  useListItemsRx()  │ useSyncStatus()│   │
│  └────────┬───────────────────┬──────────────────┬──────┘   │
└───────────┼───────────────────┼──────────────────┼──────────┘
            │                   │                  │
            ▼                   ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                     RxJS Services Layer                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ ListRxService   │  │ListItemRxService│  │ SyncService │ │
│  │  - getLists$()  │  │ - getItems$()   │  │ - sync()    │ │
│  │  - create()     │  │ - toggle()      │  │ - getState$()││
│  └────────┬────────┘  └────────┬────────┘  └──────┬──────┘ │
└───────────┼───────────────────┼──────────────────┼─────────┘
            │                   │                  │
            ▼                   ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    IndexedDB (Dexie)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │    Lists     │  │   ListItems  │  │ SyncOperations   │  │
│  │              │  │              │  │  (Queue)         │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP (когда online)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend (NestJS)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           POST /lists/sync                           │   │
│  │  - Process operations queue                          │   │
│  │  - Apply Operational Transform                       │   │
│  │  - Return updated state                              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   PostgreSQL Database                        │
│              (Lists, ListItems with versions)                │
└─────────────────────────────────────────────────────────────┘
```

### Принципы работы

1. **Optimistic Updates**: все изменения сразу применяются локально в IndexedDB
2. **Operation Queue**: каждое изменение записывается как операция в очередь синхронизации
3. **Background Sync**: синхронизация происходит автоматически в фоне
4. **Version-based Conflicts**: конфликты обнаруживаются через version field
5. **OT Resolution**: конфликты разрешаются через Operational Transform

---

## Ключевые концепции

### 1. Single Source of Truth

**IndexedDB - это источник истины на клиенте**. Все данные читаются из локальной БД, а не из памяти или store.

```typescript
// ❌ Плохо - данные в памяти
const lists = ref([])
const response = await api.getLists()
lists.value = response.data

// ✅ Хорошо - данные из IndexedDB через RxJS
const lists$ = from(liveQuery(() => db.lists.toArray()))
```

### 2. Optimistic UI

Все операции сначала выполняются локально, затем синхронизируются.

```typescript
async createList(title: string) {
  // 1. Сразу добавляем в IndexedDB
  await db.lists.add({ id, title, syncStatus: PENDING })

  // 2. UI автоматически обновляется через RxJS

  // 3. Добавляем в очередь для синхронизации
  await db.syncOperations.add({ type: 'CREATE', entityId: id })

  // 4. Синхронизация в фоне
}
```

### 3. Operation Log

Все изменения логируются как операции с timestamp.

```typescript
interface SyncOperation {
  id: number
  entityType: 'list' | 'listItem'
  entityId: string
  operationType: 'CREATE' | 'UPDATE' | 'DELETE'
  version: number
  timestamp: number
  data: any
  retryCount: number
}
```

### 4. Versioning

Каждая сущность имеет `version` field для обнаружения конфликтов.

```typescript
// При каждом UPDATE version увеличивается
UPDATE lists
SET title = 'New Title', version = version + 1
WHERE id = '123' AND version = 5  -- Optimistic locking
```

### 5. Sync States

```typescript
enum SyncStatus {
  SYNCED = 'SYNCED',       // Синхронизировано с сервером
  PENDING = 'PENDING',     // Ожидает синхронизации
  SYNCING = 'SYNCING',     // В процессе синхронизации
  ERROR = 'ERROR',         // Ошибка синхронизации
}
```

---

## Frontend Implementation

### Database Layer (Dexie)

**Файл:** `src/shared/db/database.ts`

```typescript
import Dexie, { Table } from 'dexie';
import type { List, ListItem } from '@entities/list';

export enum OperationType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export enum SyncStatus {
  SYNCED = 'SYNCED',
  PENDING = 'PENDING',
  SYNCING = 'SYNCING',
  ERROR = 'ERROR',
}

// Расширенные типы с метаданными для offline
export interface LocalList extends List {
  version: number;
  syncStatus: SyncStatus;
  localTimestamp: number;
}

export interface LocalListItem extends ListItem {
  version: number;
  syncStatus: SyncStatus;
  localTimestamp: number;
}

// Операция в очереди синхронизации
export interface SyncOperation {
  id?: number; // Auto-increment ID
  entityType: 'list' | 'listItem';
  entityId: string;
  operationType: OperationType;
  version: number;
  timestamp: number;
  data: any;
  retryCount: number;
}

export class WiselistDatabase extends Dexie {
  lists!: Table<LocalList, string>;
  listItems!: Table<LocalListItem, string>;
  syncOperations!: Table<SyncOperation, number>;

  constructor() {
    super('WiselistDB');

    this.version(1).stores({
      lists: 'id, ownerId, syncStatus, localTimestamp',
      listItems: 'id, listId, syncStatus, localTimestamp',
      syncOperations: '++id, entityType, entityId, timestamp',
    });
  }
}

export const db = new WiselistDatabase();
```

**Ключевые моменты:**
- `WiselistDatabase` extends `Dexie` - основной класс БД
- Три таблицы: `lists`, `listItems`, `syncOperations`
- Индексы для быстрого поиска
- `LocalList` и `LocalListItem` расширяют базовые типы метаданными

---

### RxJS Service Layer

#### List Service

**Файл:** `src/shared/services/rxjs/list.service.ts`

```typescript
import { BehaviorSubject, Observable, from } from 'rxjs';
import { map, distinctUntilChanged, shareReplay } from 'rxjs/operators';
import { liveQuery } from 'dexie';
import { db, type LocalList, SyncStatus, OperationType } from '@shared/db/database';
import { v4 as uuidv4 } from 'uuid';

class ListRxService {
  // Главный стрим всех списков
  private lists$ = new BehaviorSubject<LocalList[]>([]);

  // Статус синхронизации
  private syncStatus$ = new BehaviorSubject<{
    isSyncing: boolean;
    pendingCount: number;
    lastSync: number | null;
  }>({
    isSyncing: false,
    pendingCount: 0,
    lastSync: null,
  });

  constructor() {
    this.initializeLiveQuery();
    this.initializeSyncStatusQuery();
  }

  // Инициализация live query из Dexie
  private initializeLiveQuery() {
    from(
      liveQuery(() => db.lists.toArray())
    ).subscribe((lists) => {
      this.lists$.next(lists);
    });
  }

  private initializeSyncStatusQuery() {
    from(
      liveQuery(() => db.syncOperations.count())
    ).subscribe((count) => {
      this.syncStatus$.next({
        ...this.syncStatus$.value,
        pendingCount: count,
      });
    });
  }

  // Получить Observable всех списков
  getLists$(): Observable<LocalList[]> {
    return this.lists$.asObservable().pipe(
      map(lists => lists.filter(l => l.syncStatus !== SyncStatus.ERROR)),
      distinctUntilChanged(),
      shareReplay(1)
    );
  }

  // Получить Observable конкретного списка
  getList$(id: string): Observable<LocalList | undefined> {
    return this.lists$.pipe(
      map(lists => lists.find(l => l.id === id)),
      distinctUntilChanged(),
      shareReplay(1)
    );
  }

  // Получить Observable статуса синхронизации
  getSyncStatus$(): Observable<typeof this.syncStatus$.value> {
    return this.syncStatus$.asObservable();
  }

  // Создание списка (optimistic)
  async createList(title: string, type: 'SHOPPING' | 'TODO' | 'OTHER', ownerId: string) {
    const id = uuidv4();
    const now = Date.now();

    const newList: LocalList = {
      id,
      title,
      type,
      ownerId,
      version: 0,
      syncStatus: SyncStatus.PENDING,
      localTimestamp: now,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: [],
      owner: null as any,
      shares: [],
    };

    // Optimistic update - сразу добавляем в IndexedDB
    await db.lists.add(newList);

    // Добавляем операцию в очередь синхронизации
    await db.syncOperations.add({
      entityType: 'list',
      entityId: id,
      operationType: OperationType.CREATE,
      version: 0,
      timestamp: now,
      data: { title, type },
      retryCount: 0,
    });

    return id;
  }

  // Обновление списка (optimistic)
  async updateList(id: string, updates: { title?: string }) {
    const existing = await db.lists.get(id);
    if (!existing) throw new Error('List not found');

    const now = Date.now();

    // Optimistic update
    await db.lists.update(id, {
      ...updates,
      syncStatus: SyncStatus.PENDING,
      localTimestamp: now,
      updatedAt: new Date().toISOString(),
    });

    // Добавляем в очередь
    await db.syncOperations.add({
      entityType: 'list',
      entityId: id,
      operationType: OperationType.UPDATE,
      version: existing.version,
      timestamp: now,
      data: updates,
      retryCount: 0,
    });
  }

  // Удаление списка (optimistic)
  async deleteList(id: string) {
    const existing = await db.lists.get(id);
    if (!existing) return;

    const now = Date.now();

    // Optimistic delete - удаляем из IndexedDB
    await db.lists.delete(id);

    // Также удаляем все items этого списка
    await db.listItems.where('listId').equals(id).delete();

    // Добавляем в очередь
    await db.syncOperations.add({
      entityType: 'list',
      entityId: id,
      operationType: OperationType.DELETE,
      version: existing.version,
      timestamp: now,
      data: null,
      retryCount: 0,
    });
  }
}

export const listRxService = new ListRxService();
```

**Ключевые особенности:**
- `liveQuery` от Dexie - автоматическое обновление при изменениях в БД
- `BehaviorSubject` - хранит текущее состояние
- `shareReplay(1)` - кэширует последнее значение для новых подписчиков
- Все операции сначала изменяют IndexedDB, потом добавляют в очередь

#### ListItem Service

**Файл:** `src/shared/services/rxjs/list-item.service.ts`

```typescript
import { from } from 'rxjs';
import { liveQuery } from 'dexie';
import { db, type LocalListItem, SyncStatus, OperationType } from '@shared/db/database';
import { v4 as uuidv4 } from 'uuid';
import { map, distinctUntilChanged, shareReplay } from 'rxjs/operators';

class ListItemRxService {
  // Получить items для конкретного списка
  getListItems$(listId: string) {
    return from(
      liveQuery(() =>
        db.listItems.where('listId').equals(listId).toArray()
      )
    ).pipe(
      map(items => items.filter(i => i.syncStatus !== SyncStatus.ERROR)),
      distinctUntilChanged(),
      shareReplay(1)
    );
  }

  // Создание item
  async createListItem(listId: string, content: string) {
    const id = uuidv4();
    const now = Date.now();

    const newItem: LocalListItem = {
      id,
      listId,
      content,
      checked: false,
      version: 0,
      syncStatus: SyncStatus.PENDING,
      localTimestamp: now,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.listItems.add(newItem);

    await db.syncOperations.add({
      entityType: 'listItem',
      entityId: id,
      operationType: OperationType.CREATE,
      version: 0,
      timestamp: now,
      data: { listId, content, checked: false },
      retryCount: 0,
    });

    return id;
  }

  // Toggle checked
  async toggleListItem(id: string, checked: boolean) {
    const existing = await db.listItems.get(id);
    if (!existing) return;

    const now = Date.now();

    await db.listItems.update(id, {
      checked,
      syncStatus: SyncStatus.PENDING,
      localTimestamp: now,
      updatedAt: new Date().toISOString(),
    });

    await db.syncOperations.add({
      entityType: 'listItem',
      entityId: id,
      operationType: OperationType.UPDATE,
      version: existing.version,
      timestamp: now,
      data: { checked },
      retryCount: 0,
    });
  }

  // Обновление content
  async updateListItem(id: string, content: string) {
    const existing = await db.listItems.get(id);
    if (!existing) return;

    const now = Date.now();

    await db.listItems.update(id, {
      content,
      syncStatus: SyncStatus.PENDING,
      localTimestamp: now,
      updatedAt: new Date().toISOString(),
    });

    await db.syncOperations.add({
      entityType: 'listItem',
      entityId: id,
      operationType: OperationType.UPDATE,
      version: existing.version,
      timestamp: now,
      data: { content },
      retryCount: 0,
    });
  }

  // Удаление item
  async deleteListItem(id: string) {
    const existing = await db.listItems.get(id);
    if (!existing) return;

    const now = Date.now();

    await db.listItems.delete(id);

    await db.syncOperations.add({
      entityType: 'listItem',
      entityId: id,
      operationType: OperationType.DELETE,
      version: existing.version,
      timestamp: now,
      data: null,
      retryCount: 0,
    });
  }
}

export const listItemRxService = new ListItemRxService();
```

---

### Sync Engine

**Файл:** `src/shared/services/sync/sync.service.ts`

```typescript
import { BehaviorSubject, interval, fromEvent } from 'rxjs';
import { filter } from 'rxjs/operators';
import { db, type SyncOperation, SyncStatus } from '@shared/db/database';
import { API } from '@shared/instances/axios';
import { tokenService } from '@shared/services/token.service';

interface SyncState {
  isSyncing: boolean;
  lastSync: number | null;
  error: string | null;
}

class SyncService {
  private syncState$ = new BehaviorSubject<SyncState>({
    isSyncing: false,
    lastSync: null,
    error: null,
  });

  private isOnline = navigator.onLine;

  constructor() {
    this.initializeNetworkListeners();
    this.initializeAutoSync();
  }

  private initializeNetworkListeners() {
    // Слушаем изменения сети
    fromEvent(window, 'online').subscribe(() => {
      console.log('Network: Online');
      this.isOnline = true;
      this.sync(); // Автосинхронизация при возвращении онлайн
    });

    fromEvent(window, 'offline').subscribe(() => {
      console.log('Network: Offline');
      this.isOnline = false;
    });
  }

  private initializeAutoSync() {
    // Автосинхронизация каждые 30 секунд, если есть pending операции
    interval(30000)
      .pipe(
        filter(() => this.isOnline && !this.syncState$.value.isSyncing)
      )
      .subscribe(() => {
        this.sync();
      });
  }

  getSyncState$() {
    return this.syncState$.asObservable();
  }

  async sync(): Promise<void> {
    if (!this.isOnline) {
      console.log('Offline - skipping sync');
      return;
    }

    if (this.syncState$.value.isSyncing) {
      console.log('Sync already in progress');
      return;
    }

    this.syncState$.next({
      isSyncing: true,
      lastSync: this.syncState$.value.lastSync,
      error: null,
    });

    try {
      // 1. Проверяем токен, обновляем если нужно
      if (tokenService.isAccessTokenExpired()) {
        await this.refreshToken();
      }

      // 2. Получаем все pending операции
      const operations = await db.syncOperations.toArray();

      if (operations.length === 0) {
        this.syncState$.next({
          isSyncing: false,
          lastSync: Date.now(),
          error: null,
        });
        return;
      }

      console.log(`Syncing ${operations.length} operations...`);

      // 3. Группируем операции по типам
      const listOps = operations.filter(op => op.entityType === 'list');
      const itemOps = operations.filter(op => op.entityType === 'listItem');

      // 4. Отправляем на сервер
      const response = await API.post('/lists/sync', {
        listOperations: listOps.map(op => ({
          id: op.entityId,
          type: op.operationType,
          version: op.version,
          timestamp: op.timestamp,
          data: op.data,
        })),
        itemOperations: itemOps.map(op => ({
          id: op.entityId,
          listId: op.data?.listId,
          type: op.operationType,
          version: op.version,
          timestamp: op.timestamp,
          data: op.data,
        })),
      });

      // 5. Обрабатываем ответ
      await this.processSyncResponse(response.data);

      // 6. Удаляем успешно синхронизированные операции
      await db.syncOperations.clear();

      console.log('Sync completed successfully');

      // 7. Обновляем статус
      this.syncState$.next({
        isSyncing: false,
        lastSync: Date.now(),
        error: null,
      });

    } catch (error: any) {
      console.error('Sync failed:', error);

      // Увеличиваем retry count для операций
      const operations = await db.syncOperations.toArray();
      for (const op of operations) {
        if (op.retryCount < 3) {
          await db.syncOperations.update(op.id!, {
            retryCount: op.retryCount + 1,
          });
        }
      }

      this.syncState$.next({
        isSyncing: false,
        lastSync: this.syncState$.value.lastSync,
        error: error.message,
      });
    }
  }

  private async processSyncResponse(data: any) {
    console.log('Processing sync response:', data);

    // Обновляем списки с сервера
    for (const list of data.lists) {
      await db.lists.put({
        ...list,
        syncStatus: SyncStatus.SYNCED,
        localTimestamp: Date.now(),
      });
    }

    // Обновляем items с сервера
    for (const item of data.items) {
      await db.listItems.put({
        ...item,
        syncStatus: SyncStatus.SYNCED,
        localTimestamp: Date.now(),
      });
    }

    // Обрабатываем конфликты
    if (data.conflicts && (data.conflicts.listIds.length > 0 || data.conflicts.itemIds.length > 0)) {
      console.warn('Conflicts detected:', data.conflicts);
      // TODO: Show UI notification about conflicts
    }
  }

  private async refreshToken() {
    const refreshToken = tokenService.refreshToken;
    if (!refreshToken) throw new Error('No refresh token');

    const response = await API.post('/auth/refresh', { refreshToken });
    tokenService.setAccessToken(response.data.accessToken);
  }

  // Принудительная синхронизация (для pull-to-refresh)
  async forceSync(): Promise<void> {
    return this.sync();
  }
}

export const syncService = new SyncService();
```

**Ключевые особенности:**
- Автоматическая синхронизация при возвращении online
- Периодическая синхронизация каждые 30 секунд
- Retry механизм для failed операций
- Автоматическое обновление токена перед синхронизацией

---

### Vue Composables

#### useListsRx

**Файл:** `src/entities/list/composables/useListsRx.ts`

```typescript
import { ref, onMounted, onUnmounted } from 'vue';
import { Subscription } from 'rxjs';
import { listRxService } from '@shared/services/rxjs/list.service';
import { syncService } from '@shared/services/sync/sync.service';
import type { LocalList } from '@shared/db/database';
import { useUserStore } from '@entities/user';

export function useListsRx() {
  const lists = ref<LocalList[]>([]);
  const syncStatus = ref({
    isSyncing: false,
    pendingCount: 0,
    lastSync: null as number | null,
  });
  const isLoading = ref(true);

  const userStore = useUserStore();

  let listsSubscription: Subscription;
  let syncSubscription: Subscription;
  let syncStateSubscription: Subscription;

  onMounted(() => {
    // Подписываемся на стрим списков
    listsSubscription = listRxService.getLists$().subscribe((data) => {
      lists.value = data;
      isLoading.value = false;
    });

    // Подписываемся на статус синхронизации
    syncSubscription = listRxService.getSyncStatus$().subscribe((status) => {
      syncStatus.value = status;
    });

    syncStateSubscription = syncService.getSyncState$().subscribe((state) => {
      syncStatus.value = {
        ...syncStatus.value,
        isSyncing: state.isSyncing,
        lastSync: state.lastSync,
      };
    });

    // Инициируем первую синхронизацию
    syncService.sync();
  });

  onUnmounted(() => {
    listsSubscription?.unsubscribe();
    syncSubscription?.unsubscribe();
    syncStateSubscription?.unsubscribe();
  });

  const createList = async (title: string, type: 'SHOPPING' | 'TODO' | 'OTHER') => {
    const ownerId = userStore.user?.id;
    if (!ownerId) throw new Error('User not authenticated');

    await listRxService.createList(title, type, ownerId);
    // Синхронизация произойдет автоматически
  };

  const updateList = async (id: string, updates: { title?: string }) => {
    await listRxService.updateList(id, updates);
  };

  const deleteList = async (id: string) => {
    await listRxService.deleteList(id);
  };

  const manualSync = () => {
    syncService.sync();
  };

  return {
    lists,
    syncStatus,
    isLoading,
    createList,
    updateList,
    deleteList,
    manualSync,
  };
}
```

#### useListItemsRx

**Файл:** `src/entities/list-item/composables/useListItemsRx.ts`

```typescript
import { ref, onMounted, onUnmounted, watch, type Ref } from 'vue';
import { Subscription } from 'rxjs';
import { listItemRxService } from '@shared/services/rxjs/list-item.service';
import type { LocalListItem } from '@shared/db/database';

export function useListItemsRx(listId: Ref<string>) {
  const items = ref<LocalListItem[]>([]);
  const isLoading = ref(true);

  let subscription: Subscription;

  const subscribe = (id: string) => {
    subscription?.unsubscribe();
    isLoading.value = true;

    subscription = listItemRxService.getListItems$(id).subscribe((data) => {
      items.value = data;
      isLoading.value = false;
    });
  };

  onMounted(() => {
    if (listId.value) {
      subscribe(listId.value);
    }
  });

  watch(listId, (newId) => {
    if (newId) {
      subscribe(newId);
    }
  });

  onUnmounted(() => {
    subscription?.unsubscribe();
  });

  const createItem = async (content: string) => {
    await listItemRxService.createListItem(listId.value, content);
  };

  const toggleItem = async (id: string, checked: boolean) => {
    await listItemRxService.toggleListItem(id, checked);
  };

  const updateItem = async (id: string, content: string) => {
    await listItemRxService.updateListItem(id, content);
  };

  const deleteItem = async (id: string) => {
    await listItemRxService.deleteListItem(id);
  };

  return {
    items,
    isLoading,
    createItem,
    toggleItem,
    updateItem,
    deleteItem,
  };
}
```

---

### UI Components

#### Sync Status Indicator

**Файл:** `src/widgets/SyncStatusIndicator.vue`

```vue
<template>
  <div class="sync-status" :class="statusClass">
    <ion-icon :icon="statusIcon" :class="{ 'rotating': syncState.isSyncing }" />
    <span class="status-text">{{ statusText }}</span>
    <span v-if="syncStatus.pendingCount > 0" class="badge">
      {{ syncStatus.pendingCount }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { IonIcon } from '@ionic/vue';
import {
  cloudDoneOutline,
  cloudUploadOutline,
  cloudOfflineOutline,
  warningOutline,
  syncOutline
} from 'ionicons/icons';
import { syncService } from '@shared/services/sync/sync.service';
import { listRxService } from '@shared/services/rxjs/list.service';
import { Subscription } from 'rxjs';

const syncState = ref({
  isSyncing: false,
  lastSync: null as number | null,
  error: null as string | null,
});

const syncStatus = ref({
  isSyncing: false,
  pendingCount: 0,
  lastSync: null as number | null,
});

const isOnline = ref(navigator.onLine);

let syncStateSub: Subscription;
let syncStatusSub: Subscription;

onMounted(() => {
  syncStateSub = syncService.getSyncState$().subscribe((state) => {
    syncState.value = state;
  });

  syncStatusSub = listRxService.getSyncStatus$().subscribe((status) => {
    syncStatus.value = status;
  });

  // Network status listener
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
});

onUnmounted(() => {
  syncStateSub?.unsubscribe();
  syncStatusSub?.unsubscribe();
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
});

const handleOnline = () => {
  isOnline.value = true;
};

const handleOffline = () => {
  isOnline.value = false;
};

const statusIcon = computed(() => {
  if (syncState.value.error) return warningOutline;
  if (syncState.value.isSyncing) return syncOutline;
  if (syncStatus.value.pendingCount > 0) return cloudUploadOutline;
  if (!isOnline.value) return cloudOfflineOutline;
  return cloudDoneOutline;
});

const statusText = computed(() => {
  if (syncState.value.error) return 'Sync error';
  if (syncState.value.isSyncing) return 'Syncing...';
  if (syncStatus.value.pendingCount > 0) return 'Pending';
  if (!isOnline.value) return 'Offline';
  return 'Synced';
});

const statusClass = computed(() => {
  if (syncState.value.error) return 'status-error';
  if (syncState.value.isSyncing) return 'status-syncing';
  if (syncStatus.value.pendingCount > 0) return 'status-pending';
  if (!isOnline.value) return 'status-offline';
  return 'status-synced';
});
</script>

<style scoped>
.sync-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.status-synced {
  background: rgba(46, 125, 50, 0.1);
  color: #2e7d32;
}

.status-syncing {
  background: rgba(25, 118, 210, 0.1);
  color: #1976d2;
}

.status-pending {
  background: rgba(245, 124, 0, 0.1);
  color: #f57c00;
}

.status-offline {
  background: rgba(117, 117, 117, 0.1);
  color: #757575;
}

.status-error {
  background: rgba(198, 40, 40, 0.1);
  color: #c62828;
}

ion-icon {
  font-size: 18px;
}

.rotating {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.status-text {
  font-size: 12px;
}

.badge {
  background: currentColor;
  color: white;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 600;
  min-width: 18px;
  text-align: center;
}
</style>
```

#### Lists Page Example

**Файл:** `src/pages/lists/ListsPage.vue`

```vue
<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>My Lists</ion-title>
        <ion-buttons slot="end">
          <SyncStatusIndicator />
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <div v-if="isLoading" class="loading-container">
        <ion-spinner />
        <p>Loading lists...</p>
      </div>

      <ion-list v-else-if="lists.length > 0">
        <ListItemCard
          v-for="list in lists"
          :key="list.id"
          :list="list"
          @click="openList(list.id)"
          @delete="handleDelete(list.id)"
        />
      </ion-list>

      <div v-else class="empty-state">
        <ion-icon :icon="listOutline" />
        <h2>No lists yet</h2>
        <p>Create your first shopping list</p>
      </div>
    </ion-content>

    <ion-fab vertical="bottom" horizontal="end" slot="fixed">
      <ion-fab-button @click="openCreateDialog">
        <ion-icon :icon="add" />
      </ion-fab-button>
    </ion-fab>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonList, IonFab, IonFabButton, IonIcon, IonRefresher,
  IonRefresherContent, IonButtons, IonSpinner
} from '@ionic/vue';
import { add, listOutline } from 'ionicons/icons';
import { useListsRx } from '@entities/list/composables/useListsRx';
import { useRouter } from 'vue-router';
import SyncStatusIndicator from '@widgets/SyncStatusIndicator.vue';
import ListItemCard from '@entities/list/ui/ListItemCard.vue';

const router = useRouter();
const { lists, isLoading, deleteList, manualSync } = useListsRx();

const handleRefresh = async (event: any) => {
  await manualSync();
  event.target.complete();
};

const openList = (id: string) => {
  router.push(`/lists/${id}`);
};

const handleDelete = async (id: string) => {
  await deleteList(id);
};

const openCreateDialog = () => {
  // Your dialog logic
  router.push('/lists/create');
};
</script>

<style scoped>
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 32px;
  text-align: center;
  color: var(--ion-color-medium);
}

.empty-state ion-icon {
  font-size: 80px;
  margin-bottom: 16px;
}

.empty-state h2 {
  font-size: 24px;
  margin: 0 0 8px 0;
}

.empty-state p {
  font-size: 16px;
  margin: 0;
}
</style>
```

---

## Operational Transform

### Упрощенная OT Implementation

**Файл:** `src/shared/services/sync/ot-resolver.ts`

```typescript
import type { SyncOperation } from '@shared/db/database';

export class OTResolver {
  /**
   * Упрощенный OT: приоритизируем операции по timestamp
   * Для более сложной логики используй библиотеку типа ShareDB или Yjs
   */
  static resolveConflict(
    clientOp: SyncOperation,
    serverVersion: number,
    serverData: any
  ): { shouldApply: boolean; transformedOp?: SyncOperation } {

    // Если версии совпадают - нет конфликта
    if (clientOp.version === serverVersion) {
      return { shouldApply: true };
    }

    console.log('Conflict detected:', {
      clientOp,
      serverVersion,
      serverData
    });

    // Если это операция UPDATE
    if (clientOp.operationType === 'UPDATE') {
      // Применяем Last Write Wins по timestamp
      const clientTimestamp = clientOp.timestamp;
      const serverTimestamp = new Date(serverData.updatedAt).getTime();

      if (clientTimestamp > serverTimestamp) {
        // Клиентская операция новее - применяем её с новой версией
        console.log('Client wins (newer timestamp)');
        return {
          shouldApply: true,
          transformedOp: {
            ...clientOp,
            version: serverVersion,
          },
        };
      } else {
        // Серверная версия новее - отклоняем клиентскую
        console.log('Server wins (newer timestamp)');
        return { shouldApply: false };
      }
    }

    // Для DELETE операций
    if (clientOp.operationType === 'DELETE') {
      // DELETE всегда имеет приоритет
      console.log('Delete operation - applying');
      return { shouldApply: true };
    }

    // Для CREATE операций конфликтов быть не должно (UUID уникальны)
    if (clientOp.operationType === 'CREATE') {
      console.log('Create operation - applying');
      return { shouldApply: true };
    }

    return { shouldApply: false };
  }

  /**
   * Для более продвинутого OT можно использовать поле-специфичные конфликты
   */
  static resolveFieldLevelConflict(
    clientData: Record<string, any>,
    serverData: Record<string, any>,
    clientTimestamp: number,
    serverTimestamp: number
  ): Record<string, any> {
    const result: Record<string, any> = { ...serverData };

    // Для каждого поля в клиентских данных
    for (const [key, value] of Object.entries(clientData)) {
      // Если значение отличается от серверного
      if (value !== serverData[key]) {
        // Применяем Last Write Wins
        if (clientTimestamp > serverTimestamp) {
          result[key] = value;
        }
      }
    }

    return result;
  }
}
```

### Advanced OT (для будущего)

Для более сложных случаев можешь использовать готовые библиотеки:

**Yjs:**
```typescript
import * as Y from 'yjs'

// Создаем shared document
const doc = new Y.Doc()
const yList = doc.getArray('list-items')

// При изменении
yList.push([{ content: 'New Item', checked: false }])

// Yjs автоматически разрешает конфликты
```

**ShareDB:**
```typescript
import ShareDB from 'sharedb/lib/client'
import { Socket } from 'sharedb/lib/client'

// Подключаемся к ShareDB серверу
const socket = new WebSocket('ws://localhost:8080')
const connection = new ShareDB.Connection(socket)

// Получаем документ
const doc = connection.get('lists', listId)

doc.subscribe((err) => {
  if (err) throw err

  // Применяем операции
  doc.submitOp([{ p: ['title'], oi: 'New Title' }])
})
```

---

## Testing

### Unit Tests

**Файл:** `src/shared/services/rxjs/__tests__/list.service.spec.ts`

```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { listRxService } from '../list.service';
import { db, OperationType, SyncStatus } from '@shared/db/database';

describe('ListRxService', () => {
  beforeEach(async () => {
    // Очищаем БД перед каждым тестом
    await db.lists.clear();
    await db.syncOperations.clear();
  });

  afterEach(async () => {
    await db.lists.clear();
    await db.syncOperations.clear();
  });

  describe('createList', () => {
    it('should create list optimistically in IndexedDB', async () => {
      const id = await listRxService.createList('Test List', 'SHOPPING', 'user-1');

      const list = await db.lists.get(id);
      expect(list).toBeDefined();
      expect(list?.title).toBe('Test List');
      expect(list?.type).toBe('SHOPPING');
      expect(list?.syncStatus).toBe(SyncStatus.PENDING);
    });

    it('should add CREATE operation to sync queue', async () => {
      const id = await listRxService.createList('Test List', 'TODO', 'user-1');

      const ops = await db.syncOperations.toArray();
      expect(ops).toHaveLength(1);
      expect(ops[0].operationType).toBe(OperationType.CREATE);
      expect(ops[0].entityId).toBe(id);
      expect(ops[0].entityType).toBe('list');
    });

    it('should emit new list through observable', async (done) => {
      const subscription = listRxService.getLists$().subscribe((lists) => {
        if (lists.length > 0) {
          expect(lists[0].title).toBe('Observable Test');
          subscription.unsubscribe();
          done();
        }
      });

      await listRxService.createList('Observable Test', 'OTHER', 'user-1');
    });
  });

  describe('updateList', () => {
    it('should update list and queue sync operation', async () => {
      const id = await listRxService.createList('Original', 'TODO', 'user-1');
      await db.syncOperations.clear(); // Clear CREATE op

      await listRxService.updateList(id, { title: 'Updated' });

      const list = await db.lists.get(id);
      expect(list?.title).toBe('Updated');
      expect(list?.syncStatus).toBe(SyncStatus.PENDING);

      const ops = await db.syncOperations.toArray();
      expect(ops).toHaveLength(1);
      expect(ops[0].operationType).toBe(OperationType.UPDATE);
    });

    it('should throw error if list not found', async () => {
      await expect(
        listRxService.updateList('non-existent', { title: 'Test' })
      ).rejects.toThrow('List not found');
    });
  });

  describe('deleteList', () => {
    it('should delete list from IndexedDB', async () => {
      const id = await listRxService.createList('To Delete', 'SHOPPING', 'user-1');

      await listRxService.deleteList(id);

      const list = await db.lists.get(id);
      expect(list).toBeUndefined();
    });

    it('should add DELETE operation to queue', async () => {
      const id = await listRxService.createList('To Delete', 'TODO', 'user-1');
      await db.syncOperations.clear();

      await listRxService.deleteList(id);

      const ops = await db.syncOperations.toArray();
      expect(ops).toHaveLength(1);
      expect(ops[0].operationType).toBe(OperationType.DELETE);
      expect(ops[0].entityId).toBe(id);
    });
  });
});
```

**Файл:** `src/shared/services/sync/__tests__/ot-resolver.spec.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { OTResolver } from '../ot-resolver';
import { OperationType } from '@shared/db/database';

describe('OTResolver', () => {
  describe('resolveConflict', () => {
    it('should apply operation if versions match', () => {
      const clientOp = {
        entityType: 'list' as const,
        entityId: '123',
        operationType: OperationType.UPDATE,
        version: 5,
        timestamp: Date.now(),
        data: { title: 'Updated' },
        retryCount: 0,
      };

      const result = OTResolver.resolveConflict(clientOp, 5, {});

      expect(result.shouldApply).toBe(true);
    });

    it('should apply client UPDATE if timestamp is newer', () => {
      const now = Date.now();
      const clientOp = {
        entityType: 'list' as const,
        entityId: '123',
        operationType: OperationType.UPDATE,
        version: 5,
        timestamp: now,
        data: { title: 'Client Version' },
        retryCount: 0,
      };

      const serverData = {
        version: 6,
        updatedAt: new Date(now - 10000).toISOString(), // 10 seconds older
      };

      const result = OTResolver.resolveConflict(clientOp, 6, serverData);

      expect(result.shouldApply).toBe(true);
      expect(result.transformedOp?.version).toBe(6);
    });

    it('should reject client UPDATE if timestamp is older', () => {
      const now = Date.now();
      const clientOp = {
        entityType: 'list' as const,
        entityId: '123',
        operationType: OperationType.UPDATE,
        version: 5,
        timestamp: now - 10000, // 10 seconds old
        data: { title: 'Client Version' },
        retryCount: 0,
      };

      const serverData = {
        version: 6,
        updatedAt: new Date(now).toISOString(), // Newer
      };

      const result = OTResolver.resolveConflict(clientOp, 6, serverData);

      expect(result.shouldApply).toBe(false);
    });

    it('should always apply DELETE operations', () => {
      const clientOp = {
        entityType: 'list' as const,
        entityId: '123',
        operationType: OperationType.DELETE,
        version: 5,
        timestamp: Date.now(),
        data: null,
        retryCount: 0,
      };

      const result = OTResolver.resolveConflict(clientOp, 6, {});

      expect(result.shouldApply).toBe(true);
    });
  });

  describe('resolveFieldLevelConflict', () => {
    it('should merge fields with Last Write Wins', () => {
      const clientTimestamp = Date.now();
      const serverTimestamp = clientTimestamp - 5000;

      const clientData = {
        title: 'Client Title',
        type: 'SHOPPING',
      };

      const serverData = {
        title: 'Server Title',
        type: 'TODO',
      };

      const result = OTResolver.resolveFieldLevelConflict(
        clientData,
        serverData,
        clientTimestamp,
        serverTimestamp
      );

      expect(result.title).toBe('Client Title'); // Client wins
      expect(result.type).toBe('SHOPPING'); // Client wins
    });

    it('should keep server values if server is newer', () => {
      const clientTimestamp = Date.now() - 5000;
      const serverTimestamp = Date.now();

      const clientData = {
        title: 'Client Title',
      };

      const serverData = {
        title: 'Server Title',
      };

      const result = OTResolver.resolveFieldLevelConflict(
        clientData,
        serverData,
        clientTimestamp,
        serverTimestamp
      );

      expect(result.title).toBe('Server Title'); // Server wins
    });
  });
});
```

### E2E Tests

**Файл:** `tests/e2e/offline-sync.spec.ts`

```typescript
describe('Offline Sync Flow', () => {
  beforeEach(() => {
    cy.clearIndexedDB();
    cy.login();
  });

  it('should create list offline and sync when online', () => {
    // Go offline
    cy.window().then((win) => {
      win.dispatchEvent(new Event('offline'));
    });

    // Navigate to lists page
    cy.visit('/lists');

    // Create new list
    cy.get('[data-test="create-list-btn"]').click();
    cy.get('[data-test="list-title-input"]').type('Offline Shopping List');
    cy.get('[data-test="list-type-select"]').select('SHOPPING');
    cy.get('[data-test="submit-btn"]').click();

    // Verify list appears in UI
    cy.contains('Offline Shopping List').should('exist');

    // Verify sync status shows offline
    cy.get('[data-test="sync-status"]').should('contain', 'Offline');

    // Add items to list
    cy.contains('Offline Shopping List').click();
    cy.get('[data-test="add-item-input"]').type('Milk');
    cy.get('[data-test="add-item-btn"]').click();
    cy.contains('Milk').should('exist');

    // Go back online
    cy.window().then((win) => {
      win.dispatchEvent(new Event('online'));
    });

    // Wait for sync to complete
    cy.get('[data-test="sync-status"]', { timeout: 10000 })
      .should('contain', 'Synced');

    // Verify data persisted on server
    cy.request('/api/lists').then((response) => {
      expect(response.body).to.have.length(1);
      expect(response.body[0].title).to.equal('Offline Shopping List');
      expect(response.body[0].items).to.have.length(1);
      expect(response.body[0].items[0].content).to.equal('Milk');
    });
  });

  it('should handle conflicts with Last Write Wins', () => {
    // Create list
    cy.visit('/lists');
    cy.get('[data-test="create-list-btn"]').click();
    cy.get('[data-test="list-title-input"]').type('Conflict Test');
    cy.get('[data-test="submit-btn"]').click();

    // Wait for sync
    cy.wait(1000);

    // Go offline
    cy.window().then((win) => {
      win.dispatchEvent(new Event('offline'));
    });

    // Update list offline
    cy.contains('Conflict Test').click();
    cy.get('[data-test="edit-list-btn"]').click();
    cy.get('[data-test="list-title-input"]').clear().type('Client Update');
    cy.get('[data-test="submit-btn"]').click();

    // Simulate server-side update while offline
    cy.request('PATCH', '/api/lists/123', { title: 'Server Update' });

    // Go back online
    cy.window().then((win) => {
      win.dispatchEvent(new Event('online'));
    });

    // Wait for sync
    cy.wait(2000);

    // Verify conflict resolution (client should win if timestamp is newer)
    cy.contains('Client Update').should('exist');
  });

  it('should delete list offline and sync deletion', () => {
    // Create and sync list first
    cy.visit('/lists');
    cy.get('[data-test="create-list-btn"]').click();
    cy.get('[data-test="list-title-input"]').type('To Delete');
    cy.get('[data-test="submit-btn"]').click();
    cy.wait(1000);

    // Go offline
    cy.window().then((win) => {
      win.dispatchEvent(new Event('offline'));
    });

    // Delete list
    cy.get('[data-test="list-item"]').first().swipe('left');
    cy.get('[data-test="delete-btn"]').click();
    cy.get('[data-test="confirm-delete-btn"]').click();

    // Verify list removed from UI
    cy.contains('To Delete').should('not.exist');

    // Go online
    cy.window().then((win) => {
      win.dispatchEvent(new Event('online'));
    });

    // Wait for sync
    cy.wait(2000);

    // Verify deletion synced to server
    cy.request('/api/lists').then((response) => {
      expect(response.body).to.have.length(0);
    });
  });
});
```

---

## Migration Plan

### Phase 1: Database Setup (2-3 дня)

**Tasks:**
1. Создать `WiselistDatabase` класс с Dexie
2. Определить схемы таблиц (`lists`, `listItems`, `syncOperations`)
3. Создать типы для локальных данных (`LocalList`, `LocalListItem`)
4. Добавить enum для `SyncStatus` и `OperationType`
5. Написать unit тесты для database layer

**Files to create:**
- `src/shared/db/database.ts`
- `src/shared/db/__tests__/database.spec.ts`

### Phase 2: RxJS Services (3-4 дня)

**Tasks:**
1. Создать `ListRxService` с CRUD операциями
2. Создать `ListItemRxService` с CRUD операциями
3. Реализовать `liveQuery` интеграцию с RxJS
4. Добавить optimistic updates
5. Реализовать operation queueing
6. Написать unit тесты для services

**Files to create:**
- `src/shared/services/rxjs/list.service.ts`
- `src/shared/services/rxjs/list-item.service.ts`
- `src/shared/services/rxjs/__tests__/list.service.spec.ts`
- `src/shared/services/rxjs/__tests__/list-item.service.spec.ts`

### Phase 3: Sync Engine (3-4 дня)

**Tasks:**
1. Создать `SyncService` с network listeners
2. Реализовать auto-sync механизм
3. Добавить token refresh перед sync
4. Реализовать retry логику
5. Создать `OTResolver` для конфликтов
6. Написать unit и integration тесты

**Files to create:**
- `src/shared/services/sync/sync.service.ts`
- `src/shared/services/sync/ot-resolver.ts`
- `src/shared/services/sync/__tests__/sync.service.spec.ts`
- `src/shared/services/sync/__tests__/ot-resolver.spec.ts`

### Phase 4: Vue Composables (2-3 дня)

**Tasks:**
1. Создать `useListsRx` composable
2. Создать `useListItemsRx` composable
3. Создать `useSyncStatus` composable
4. Интеграция с existing user store
5. Написать тесты для composables

**Files to create:**
- `src/entities/list/composables/useListsRx.ts`
- `src/entities/list-item/composables/useListItemsRx.ts`
- `src/shared/composables/useSyncStatus.ts`
- Tests for composables

### Phase 5: UI Components (2-3 дня)

**Tasks:**
1. Создать `SyncStatusIndicator` component
2. Обновить `ListsPage` для использования RxJS
3. Обновить `ListDetailPage` для использования RxJS
4. Добавить pull-to-refresh
5. Добавить offline indicators
6. Toast notifications для sync events

**Files to modify/create:**
- `src/widgets/SyncStatusIndicator.vue`
- `src/pages/lists/ListsPage.vue`
- `src/pages/lists/ListDetailPage.vue`

### Phase 6: Backend Integration (см. BACKEND_SYNC_GUIDE.md)

**Tasks:**
1. Обновить Prisma schema с version field
2. Создать sync DTOs
3. Реализовать POST /lists/sync endpoint
4. Добавить OT logic на backend
5. Написать E2E тесты

### Phase 7: Testing & Polish (2-3 дня)

**Tasks:**
1. E2E тесты для offline scenarios
2. Performance тестирование
3. Edge cases тестирование
4. UI/UX полировка
5. Documentation

---

## Best Practices

### 1. Всегда используй IndexedDB как источник истины

```typescript
// ❌ Плохо
const lists = ref([])
const fetchLists = async () => {
  const response = await api.getLists()
  lists.value = response.data
}

// ✅ Хорошо
const lists$ = listRxService.getLists$()
```

### 2. Используй liveQuery для реактивности

```typescript
// liveQuery автоматически обновляет данные при изменениях в IndexedDB
from(liveQuery(() => db.lists.toArray()))
  .subscribe(lists => {
    // UI автоматически обновится
  })
```

### 3. Всегда добавляй операции в очередь

```typescript
async createList(title: string) {
  // 1. Optimistic update
  await db.lists.add(newList)

  // 2. Queue для sync (ОБЯЗАТЕЛЬНО!)
  await db.syncOperations.add({
    entityType: 'list',
    operationType: 'CREATE',
    // ...
  })
}
```

### 4. Обрабатывай network events

```typescript
// Автоматическая синхронизация при восстановлении связи
window.addEventListener('online', () => {
  syncService.sync()
})
```

### 5. Используй version для optimistic locking

```typescript
// На backend
UPDATE lists
SET title = $1, version = version + 1
WHERE id = $2 AND version = $3
```

### 6. Обрабатывай ошибки gracefully

```typescript
try {
  await syncService.sync()
} catch (error) {
  // Не показывай ошибку пользователю если офлайн
  if (navigator.onLine) {
    showToast('Sync failed. Will retry.')
  }
}
```

### 7. Cleanup subscriptions

```typescript
onUnmounted(() => {
  subscription?.unsubscribe()
})
```

### 8. Тестируй offline scenarios

```typescript
it('should work offline', () => {
  cy.window().then(win => {
    win.dispatchEvent(new Event('offline'))
  })

  // Test offline functionality
})
```

---

## Troubleshooting

### Проблема: Данные не синхронизируются

**Решение:**
1. Проверь network status: `navigator.onLine`
2. Проверь очередь операций: `db.syncOperations.toArray()`
3. Проверь логи в sync service
4. Проверь токен авторизации

### Проблема: Конфликты не разрешаются

**Решение:**
1. Убедись что version field обновляется на backend
2. Проверь OT resolver логику
3. Проверь timestamps в операциях

### Проблема: UI не обновляется

**Решение:**
1. Убедись что используешь `liveQuery`
2. Проверь что subscription не unsubscribed
3. Проверь что данные записываются в IndexedDB

### Проблема: Memory leaks

**Решение:**
1. Всегда unsubscribe в `onUnmounted`
2. Используй `shareReplay(1)` для кэширования
3. Проверь DevTools Memory profiler

---

## Дальнейшее развитие

### Real-time Updates (WebSocket)

После базовой реализации можно добавить WebSocket для real-time обновлений:

```typescript
// src/shared/services/websocket.service.ts

class WebSocketService {
  private socket: WebSocket;
  private updates$ = new Subject<any>();

  connect() {
    this.socket = new WebSocket('ws://localhost:3000');

    this.socket.onmessage = (event) => {
      const update = JSON.parse(event.data);
      this.updates$.next(update);
    };
  }

  getUpdates$() {
    return this.updates$.asObservable();
  }
}
```

### Advanced OT с Yjs

Для более сложных случаев:

```typescript
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

const doc = new Y.Doc()
const wsProvider = new WebsocketProvider('ws://localhost:3000', 'room', doc)

const yList = doc.getArray('items')
yList.observe(event => {
  // Автоматическое обновление UI
})
```

### Conflict Resolution UI

Показывать пользователю конфликты:

```vue
<ConflictDialog
  :conflicts="conflicts"
  @resolve="handleResolve"
/>
```

---

## Заключение

Эта архитектура обеспечит:
- ⚡ Мгновенный UI
- 📱 Полноценную работу offline
- 🔄 Автоматическую синхронизацию
- 🤝 Разрешение конфликтов при совместной работе
- 🛡️ Надежность через operation queue

**Next steps:** Начни с Phase 1 (Database Setup) и двигайся последовательно по фазам!
