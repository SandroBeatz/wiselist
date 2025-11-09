# Sync Lifecycle - Полная документация

## Оглавление
1. [Обзор архитектуры](#обзор-архитектуры)
2. [Состояния синхронизации](#состояния-синхронизации)
3. [Инициализация приложения](#инициализация-приложения)
4. [Login Flow](#login-flow)
5. [Logout Flow](#logout-flow)
6. [Sync Flow](#sync-flow)
7. [Auto-Sync Mechanism](#auto-sync-mechanism)
8. [Authentication Guards](#authentication-guards)
9. [Error Handling](#error-handling)
10. [Troubleshooting](#troubleshooting)

---

## Обзор архитектуры

### Ключевые компоненты

```
┌─────────────────────────────────────────────────────────────┐
│                         App.vue                             │
│  • Инициализация приложения                                 │
│  • Запуск sync для authenticated users                      │
└───────────────┬─────────────────────────────────────────────┘
                │
                ├──► UserStore (user.store.ts)
                │    • setTokens() → forceSync()
                │    • logout() → syncService.stop()
                │
                ├──► SyncService (sync.service.ts)
                │    • start() → auto-sync interval + initial sync
                │    • sync() → отправка операций на сервер
                │    • stop() → остановка auto-sync
                │
                ├──► TokenService (token.service.ts)
                │    • isAuthenticated()
                │    • hasValidAccessToken()
                │    • hasValidRefreshToken()
                │
                └──► IndexedDB (db.ts)
                     • lists - локальное хранилище списков
                     • listItems - локальное хранилище айтемов
                     • syncOperations - очередь pending операций
```

### Жизненный цикл Sync Service

```
┌─────────────┐
│  App Init   │
└──────┬──────┘
       │
       ▼
┌─────────────────┐      No      ┌────────────────┐
│ Authenticated?  ├──────────────►│ Sync не        │
└────────┬────────┘               │ запускается    │
         │ Yes                    └────────────────┘
         ▼
┌─────────────────┐
│ syncService     │
│ .start()        │
└────────┬────────┘
         │
         ├──► RxJS Interval (каждые 30 сек)
         │    • Filter: isOnline && !isSyncing && isAuthenticated()
         │    • Action: sync()
         │
         └──► Initial Sync (при старте)
              • Если isOnline && isAuthenticated()
              • Action: sync()
```

---

## Состояния синхронизации

### SyncState Interface

```typescript
interface SyncState {
  isSyncing: boolean       // Идет ли синхронизация в данный момент
  isOnline: boolean        // Есть ли интернет соединение
  lastSync: number | null  // Timestamp последней успешной синхронизации
  pendingCount: number     // Количество операций в очереди
  error: string | null     // Последняя ошибка синхронизации
}
```

### Возможные состояния

| State | isSyncing | isOnline | isAuthenticated | Описание |
|-------|-----------|----------|-----------------|----------|
| **Idle (Authenticated)** | false | true | true | Пользователь залогинен, online, ждем следующего sync |
| **Syncing** | true | true | true | Идет синхронизация с сервером |
| **Offline** | false | false | true | Пользователь залогинен, но offline |
| **Unauthenticated** | false | true | false | Пользователь не залогинен, sync не работает |
| **Error** | false | true | true | Ошибка при последней синхронизации |

---

## Инициализация приложения

### App.vue - onBeforeMount

```typescript
// Файл: src/app/App.vue
onBeforeMount(async () => {
  // Шаг 1: Инициализация пользователя
  await userStore.initUser()
  // ├─► Проверяет наличие токенов в localStorage
  // ├─► Если токены есть → fetchUser() (получить данные пользователя)
  // └─► Если токены невалидны → очищает все

  // Шаг 2: Запуск мониторинга токенов
  tokenMonitorService.startMonitoring()
  // └─► Проверяет валидность access token каждые 5 минут

  // Шаг 3: Запуск синхронизации (ТОЛЬКО для authenticated users)
  if (tokenService.isAuthenticated()) {
    syncService.start()
    // ├─► Запускает RxJS interval для auto-sync
    // └─► Делает initial sync если online
  }

  // Шаг 4: Инициализация Social Login
  await SocialLogin.initialize({ /* ... */ })
})
```

### Flow Chart: App Initialization

```
START
  │
  ▼
┌──────────────────┐
│ userStore        │
│ .initUser()      │
└────────┬─────────┘
         │
         ▼
┌───────────────────┐
│ Есть токены в     │      No      ┌────────────────┐
│ localStorage?     ├──────────────►│ info = null    │
└────────┬──────────┘               └────────┬───────┘
         │ Yes                               │
         ▼                                   │
┌───────────────────┐                        │
│ fetchUser()       │                        │
│ (GET /api/users/  │                        │
│  me)              │                        │
└────────┬──────────┘                        │
         │                                   │
         ▼                                   │
┌───────────────────┐                        │
│ Токены валидны?   │      No               │
└────────┬──────────┘      │                │
         │ Yes             │                │
         │                 ▼                │
         │          ┌────────────────┐      │
         │          │ logout()       │      │
         │          └────────┬───────┘      │
         │                   │              │
         ▼                   │              │
┌──────────────────┐         │              │
│ tokenMonitorService        │              │
│ .startMonitoring() │◄──────┴──────────────┘
└────────┬─────────┘
         │
         ▼
┌────────────────────┐
│ isAuthenticated?   │      No      ┌────────────────┐
└────────┬───────────┘   ┌──────────►│ Skip sync      │
         │ Yes           │           └────────────────┘
         ▼               │
┌────────────────────┐   │
│ syncService        │   │
│ .start()           ├───┘
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ SocialLogin        │
│ .initialize()      │
└────────────────────┘
         │
         ▼
       END
```

---

## Login Flow

### UserStore.setTokens()

```typescript
// Файл: src/entities/user/model/user.store.ts
async setTokens(accessToken: string, refreshToken: string) {
  // Шаг 1: Сохранить токены в localStorage
  tokenService.setTokens(accessToken, refreshToken)

  // Шаг 2: Получить данные пользователя
  await this.fetchUser()
  // └─► GET /api/users/me

  // Шаг 3: Запустить полную синхронизацию
  try {
    await syncService.forceSync()
    // ├─► Отправляет запрос на сервер с пустыми операциями
    // ├─► Получает все списки и items пользователя
    // └─► Сохраняет данные в IndexedDB
  } catch (error) {
    console.error('[UserStore] Error syncing data on login:', error)
    // Не прерываем login если sync failed
  }
}
```

### Login Flow Chart

```
LOGIN (setTokens called)
  │
  ▼
┌─────────────────────┐
│ tokenService        │
│ .setTokens()        │
│ (save to localStorage)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ fetchUser()         │
│ GET /api/users/me   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ syncService         │
│ .forceSync()        │
└──────────┬──────────┘
           │
           ▼
┌──────────────────────┐
│ sync() method        │
│ ├─► Check auth ✓     │
│ ├─► Check online ✓   │
│ ├─► Get pending ops  │
│ │    (empty после     │
│ │     logout)         │
│ ├─► prepareSyncPayload│
│ │    • No lastSync     │
│ │      timestamp      │
│ │    • Empty operations│
│ ├─► sendSyncRequest  │
│ │    POST /api/lists/ │
│ │    sync             │
│ └─► processSyncResponse
└──────────┬──────────┘
           │
           ▼
┌────────────────────────┐
│ Server Response:       │
│ {                      │
│   lists: [...],        │
│   items: [...],        │
│   conflicts: {...},    │
│   serverTimestamp: N   │
│ }                      │
└──────────┬─────────────┘
           │
           ▼
┌────────────────────────┐
│ Save to IndexedDB:     │
│ ├─► db.lists.put()     │
│ └─► db.listItems.put() │
└──────────┬─────────────┘
           │
           ▼
┌────────────────────────┐
│ localStorage.setItem(  │
│   'lastSyncTimestamp', │
│   serverTimestamp      │
│ )                      │
└────────────────────────┘
           │
           ▼
        SUCCESS
   (UI shows lists)
```

---

## Logout Flow

### UserStore.logout()

```typescript
// Файл: src/entities/user/model/user.store.ts
async logout() {
  // Шаг 1: Остановить sync service
  syncService.stop()
  // ├─► Отменяет RxJS subscription (auto-sync interval)
  // └─► Предотвращает новые sync попытки

  // Шаг 2: Очистить state
  this.info = null

  // Шаг 3: Очистить токены
  tokenService.clearTokens()
  // └─► Удаляет accessToken и refreshToken из localStorage

  // Шаг 4: Очистить sync timestamp
  localStorage.removeItem('lastSyncTimestamp')
  // └─► Гарантирует полную синхронизацию при следующем login

  // Шаг 5: Очистить IndexedDB
  try {
    await listRxService.clearAll()      // Удалить все списки
    await listItemRxService.clearAll()  // Удалить все items
    await db.syncOperations.clear()     // Очистить очередь операций
  } catch (error) {
    console.error('[UserStore] Error clearing local database on logout:', error)
    // Продолжаем logout даже если clearing failed
  }
}
```

### Logout Flow Chart

```
LOGOUT
  │
  ▼
┌──────────────────────┐
│ syncService.stop()   │
│ • Unsubscribe RxJS   │
│   interval           │
│ • Stop auto-sync     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ this.info = null     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ tokenService         │
│ .clearTokens()       │
│ • Remove accessToken │
│ • Remove refreshToken│
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ localStorage.remove  │
│ ('lastSyncTimestamp')│
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Clear IndexedDB:     │
│ ├─► lists.clear()    │
│ ├─► listItems.clear()│
│ └─► syncOperations   │
│     .clear()         │
└──────────┬───────────┘
           │
           ▼
        SUCCESS
  (Redirect to login)
```

---

## Sync Flow

### Полный алгоритм sync()

```typescript
// Файл: src/shared/services/sync/sync.service.ts
async sync(retryCount = 0): Promise<void> {
  // ═══════════════════════════════════════════════
  // ЭТАП 1: PRE-FLIGHT CHECKS
  // ═══════════════════════════════════════════════

  // 1.1: Check Offline-Only Mode
  if (this.config.offlineOnly) {
    // Режим без backend - очистить очередь и выйти
    await db.syncOperations.clear()
    return
  }

  // 1.2: Check Authentication
  if (!tokenService.isAuthenticated()) {
    console.log('Sync skipped: not authenticated')
    return  // Gracefully exit - нет ошибки
  }

  // 1.3: Check Online Status
  if (!state.isOnline) {
    console.log('Sync skipped: offline')
    return
  }

  // 1.4: Check if Already Syncing
  if (state.isSyncing) {
    console.log('Sync skipped: already syncing')
    return
  }

  // ═══════════════════════════════════════════════
  // ЭТАП 2: PREPARE SYNC
  // ═══════════════════════════════════════════════

  try {
    // 2.1: Update state
    this.updateSyncState({ isSyncing: true, error: null })

    // 2.2: Refresh token if needed
    await this.ensureValidToken()
    // ├─► Если accessToken expired но refreshToken valid
    // │   → Обновляет токены через POST /api/auth/refresh
    // └─► Если оба токена invalid → throw error

    // 2.3: Get pending operations from IndexedDB
    const pendingOps = await db.syncOperations.toArray()

    // 2.4: Update pending count
    this.updateSyncState({ pendingCount: pendingOps.length })

    // ═══════════════════════════════════════════════
    // ЭТАП 3: PREPARE PAYLOAD
    // ═══════════════════════════════════════════════

    const payload = await this.prepareSyncPayload(pendingOps)
    // ├─► Limit to max 1000 operations
    // ├─► Merge operations by entity (keep latest only)
    // ├─► Sort by priority (DELETE > UPDATE > CREATE)
    // ├─► Group by entity type (lists vs items)
    // └─► Add lastSyncTimestamp (если есть)

    // ═══════════════════════════════════════════════
    // ЭТАП 4: SEND TO SERVER
    // ═══════════════════════════════════════════════

    const response = await this.sendSyncRequest(payload)
    // POST /api/lists/sync
    // {
    //   listOperations: [...],
    //   itemOperations: [...],
    //   lastSyncTimestamp: 1699456789123 | undefined
    // }

    // ═══════════════════════════════════════════════
    // ЭТАП 5: PROCESS RESPONSE
    // ═══════════════════════════════════════════════

    await this.processSyncResponse(response, pendingOps)
    // ├─► Save serverTimestamp to localStorage
    // ├─► Update lists in IndexedDB
    // ├─► Update items in IndexedDB
    // └─► Resolve conflicts (Last-Write-Wins)

    // ═══════════════════════════════════════════════
    // ЭТАП 6: CLEANUP
    // ═══════════════════════════════════════════════

    await this.clearSyncedOperations(pendingOps)
    // └─► Delete synced operations from syncOperations table

    // ═══════════════════════════════════════════════
    // ЭТАП 7: UPDATE STATE
    // ═══════════════════════════════════════════════

    this.updateSyncState({
      isSyncing: false,
      lastSync: Date.now(),
      pendingCount: 0,
      error: null,
    })

    console.log('Sync completed successfully')

  } catch (error) {
    // ═══════════════════════════════════════════════
    // ERROR HANDLING
    // ═══════════════════════════════════════════════

    console.error('Sync failed:', error)

    // Retry logic
    if (retryCount < this.config.maxRetries) {
      const backoff = this.config.retryBackoff * Math.pow(2, retryCount)
      console.log(`Retrying sync in ${backoff}ms`)
      await new Promise(resolve => setTimeout(resolve, backoff))
      return this.sync(retryCount + 1)
    }

    // Max retries reached
    this.updateSyncState({
      isSyncing: false,
      error: error.message || 'Sync failed',
    })

    throw error
  }
}
```

### Sync Flow Chart (Detailed)

```
SYNC START
  │
  ▼
┌─────────────────────┐
│ PRE-FLIGHT CHECKS   │
├─────────────────────┤
│ 1. offlineOnly?     │─── Yes ──► Clear queue & EXIT
│ 2. authenticated?   │─── No ───► EXIT (gracefully)
│ 3. isOnline?        │─── No ───► EXIT
│ 4. isSyncing?       │─── Yes ──► EXIT
└──────────┬──────────┘
           │ All checks passed
           ▼
┌─────────────────────┐
│ UPDATE STATE        │
│ isSyncing = true    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ ENSURE VALID TOKEN  │
├─────────────────────┤
│ accessToken valid?  │─── Yes ──┐
│    └─► No          │          │
│        │            │          │
│        ▼            │          │
│  refreshToken valid?│          │
│    ├─► Yes         │          │
│    │   └─► Refresh tokens      │
│    └─► No          │          │
│        └─► throw error         │
└──────────┬──────────┘          │
           │◄────────────────────┘
           ▼
┌─────────────────────┐
│ GET PENDING OPS     │
│ from IndexedDB      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ PREPARE PAYLOAD     │
├─────────────────────┤
│ • Limit 1000 ops    │
│ • Merge by entity   │
│ • Sort by priority  │
│ • Group by type     │
│ • Get lastSyncTime  │
└──────────┬──────────┘
           │
           ▼
    ┌──────────────┐
    │ lastSyncTime │
    │ exists?      │
    └───┬──────┬───┘
   Yes  │      │ No
        │      │
        ▼      ▼
┌───────────────────────────┐
│ INCREMENTAL   INITIAL     │
│ SYNC          SYNC        │
│ (changes      (all data)  │
│  since last)               │
└───────────┬───────────────┘
            │
            ▼
┌─────────────────────┐
│ SEND TO SERVER      │
│ POST /api/lists/sync│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ RECEIVE RESPONSE    │
├─────────────────────┤
│ • lists: []         │
│ • items: []         │
│ • conflicts: {}     │
│ • serverTimestamp   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ PROCESS RESPONSE    │
├─────────────────────┤
│ • Save timestamp    │
│ • Update lists      │
│ • Update items      │
│ • Resolve conflicts │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ CLEAR SYNCED OPS    │
│ from queue          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ UPDATE STATE        │
│ • isSyncing = false │
│ • lastSync = now    │
│ • pendingCount = 0  │
│ • error = null      │
└──────────┬──────────┘
           │
           ▼
       SUCCESS

       (On error)
           │
           ▼
┌─────────────────────┐
│ RETRY LOGIC         │
├─────────────────────┤
│ retries < max?      │─── Yes ──► Wait (exponential backoff)
└──────────┬──────────┘                │
           │ No                        │
           │                           ▼
           ▼                   ┌───────────────┐
┌─────────────────────┐        │ RETRY sync()  │
│ UPDATE STATE        │        └───────────────┘
│ • isSyncing = false │
│ • error = message   │
└─────────────────────┘
           │
           ▼
       THROW ERROR
```

---

## Auto-Sync Mechanism

### RxJS Interval

```typescript
// Файл: src/shared/services/sync/sync.service.ts
start(): void {
  // Auto-sync каждые 30 секунд
  this.autoSyncSubscription = interval(this.config.autoSyncInterval)
    .pipe(
      filter(() =>
        this.getSyncState().isOnline &&
        !this.getSyncState().isSyncing &&
        tokenService.isAuthenticated()  // ✓ Auth guard
      )
    )
    .subscribe(() => {
      this.sync().catch(error => {
        console.error('Auto-sync failed:', error)
      })
    })

  // Initial sync при старте (если online и authenticated)
  if (this.getSyncState().isOnline && tokenService.isAuthenticated()) {
    this.sync().catch(error => {
      console.error('Initial sync failed:', error)
    })
  }
}
```

### Auto-Sync Timeline

```
Time →

t=0s    ┌────────────┐
        │ start()    │
        │ called     │
        └──────┬─────┘
               │
               ├──► RxJS Interval subscription created
               │
               └──► Initial sync (if online && authenticated)

t=30s   ┌────────────┐
        │ Interval   │
        │ tick       │
        └──────┬─────┘
               │
               ├──► Filter check:
               │    • isOnline? ✓
               │    • !isSyncing? ✓
               │    • isAuthenticated? ✓
               │
               └──► sync() triggered

t=60s   ┌────────────┐
        │ Interval   │
        │ tick       │
        └──────┬─────┘
               │
               └──► sync() triggered (if filters pass)

t=90s   ┌────────────┐
        │ Interval   │
        │ tick       │
        └──────┬─────┘
               │
               └──► sync() triggered (if filters pass)

...continue every 30s...
```

### Network Event Handling

```typescript
// Файл: src/shared/services/sync/sync.service.ts
private initializeNetworkListeners(): void {
  const online$ = fromEvent(window, 'online')
  const offline$ = fromEvent(window, 'offline')

  this.networkSubscription = merge(online$, offline$)
    .pipe(debounceTime(500))
    .subscribe(() => {
      const isOnline = navigator.onLine

      this.updateSyncState({ isOnline })

      // Trigger sync при восстановлении соединения
      if (isOnline && !this.getSyncState().isSyncing) {
        console.log('Network restored - triggering sync')
        this.sync().catch(error => {
          console.error('Sync after network restore failed:', error)
        })
      }
    })
}
```

### Network Event Flow

```
OFFLINE → ONLINE (connection restored)
  │
  ▼
┌────────────────────┐
│ 'online' event     │
│ fired              │
└──────────┬─────────┘
           │
           ▼
┌────────────────────┐
│ debounceTime(500ms)│
│ (wait for stable   │
│  connection)       │
└──────────┬─────────┘
           │
           ▼
┌────────────────────┐
│ updateSyncState    │
│ isOnline = true    │
└──────────┬─────────┘
           │
           ▼
┌────────────────────┐
│ isSyncing?         │─── Yes ──► Skip (already syncing)
└──────────┬─────────┘
           │ No
           ▼
┌────────────────────┐
│ sync() triggered   │
│ (catch up with     │
│  server)           │
└────────────────────┘
```

---

## Authentication Guards

### Где проверяется аутентификация

#### 1. App.vue (Инициализация)

```typescript
// Файл: src/app/App.vue:17-19
if (tokenService.isAuthenticated()) {
  syncService.start()
}
```

**Защищает от:** Запуска sync для неаутентифицированных пользователей при инициализации приложения

---

#### 2. SyncService.start() (Initial Sync)

```typescript
// Файл: src/shared/services/sync/sync.service.ts:117
if (this.getSyncState().isOnline && tokenService.isAuthenticated()) {
  this.sync().catch(...)
}
```

**Защищает от:** Initial sync для неаутентифицированных пользователей

---

#### 3. SyncService RxJS Interval Filter

```typescript
// Файл: src/shared/services/sync/sync.service.ts:104-108
filter(() =>
  this.getSyncState().isOnline &&
  !this.getSyncState().isSyncing &&
  tokenService.isAuthenticated()  // ✓ Auth guard
)
```

**Защищает от:** Auto-sync для неаутентифицированных пользователей каждые 30 секунд

---

#### 4. SyncService.sync() (Метод)

```typescript
// Файл: src/shared/services/sync/sync.service.ts:159-162
if (!tokenService.isAuthenticated()) {
  console.log('Sync skipped: not authenticated')
  return
}
```

**Защищает от:** Любых попыток синхронизации через прямой вызов метода

---

#### 5. SyncService.ensureValidToken()

```typescript
// Файл: src/shared/services/sync/sync.service.ts:251-252
} else if (!tokenService.isAuthenticated()) {
  throw new Error('Not authenticated')
}
```

**Защищает от:** Отправки запросов на сервер без валидных токенов

---

### Defense in Depth

```
Layer 1: App.vue
         ├─► Проверка перед start()
         └─► Предотвращает инициализацию

Layer 2: SyncService.start()
         ├─► Проверка перед initial sync
         └─► Предотвращает первый sync

Layer 3: RxJS Interval Filter
         ├─► Проверка в filter operator
         └─► Предотвращает auto-sync

Layer 4: SyncService.sync()
         ├─► Проверка в начале метода
         └─► Graceful exit

Layer 5: SyncService.ensureValidToken()
         ├─► Финальная проверка перед API call
         └─► Throws error if not authenticated
```

---

## Error Handling

### Типы ошибок

#### 1. Not Authenticated

```typescript
Error: Not authenticated
```

**Причина:** Пользователь не залогинен, но sync пытался выполниться

**Обработка:**
- До исправления: Ошибка в консоли при инициализации
- После исправления: Graceful skip в sync(), нет ошибки

**Действие:** Нет (пользователь должен залогиниться)

---

#### 2. Token Refresh Failed

```typescript
Error: Authentication required
```

**Причина:** Access token expired, попытка обновить через refresh token failed

**Обработка:**
- Автоматический logout
- Редирект на страницу логина

**Действие:** Пользователь должен залогиниться заново

---

#### 3. Network Error (Offline)

```
Sync skipped: offline
```

**Причина:** Нет интернет соединения

**Обработка:**
- Операции сохраняются в queue (IndexedDB syncOperations)
- Sync автоматически возобновится при восстановлении соединения

**Действие:** Дождаться восстановления соединения

---

#### 4. Server Error (400 Bad Request)

```typescript
Error: Invalid sync request - check operation data
```

**Причина:**
- Payload слишком большой (>1000 операций)
- Невалидные данные в операциях

**Обработка:**
- Retry logic (up to 3 retries)
- Exponential backoff

**Действие:** Проверить данные в IndexedDB, очистить невалидные операции

---

#### 5. Server Error (403 Forbidden)

```typescript
Error: Access denied to lists
```

**Причина:** Пользователь пытается синхронизировать список, к которому у него нет доступа

**Обработка:**
- Retry logic
- После max retries - остается в pending queue

**Действие:** Удалить невалидные операции из queue вручную

---

#### 6. Server Error (429 Rate Limit)

```typescript
Error: Rate limit exceeded
```

**Причина:** Превышен лимит 10 sync/минуту

**Обработка:**
- Retry с backoff (60 секунд)

**Действие:** Дождаться окончания rate limit периода

---

### Retry Logic

```typescript
// Файл: src/shared/services/sync/sync.service.ts:218-224
if (retryCount < this.config.maxRetries) {
  const backoff = this.config.retryBackoff * Math.pow(2, retryCount)
  console.log(`Retrying sync in ${backoff}ms`)
  await new Promise(resolve => setTimeout(resolve, backoff))
  return this.sync(retryCount + 1)
}
```

**Параметры:**
- `maxRetries`: 3 (default)
- `retryBackoff`: 1000ms (default)

**Backoff Schedule:**
- Retry 1: 1000ms * 2^0 = 1 second
- Retry 2: 1000ms * 2^1 = 2 seconds
- Retry 3: 1000ms * 2^2 = 4 seconds
- Max retries reached → throw error

---

## Troubleshooting

### Проблема: "Sync failed: Error: Not authenticated"

**Симптомы:**
- Ошибка в консоли при загрузке приложения
- Пользователь не залогинен

**Причина:**
- `syncService.start()` вызывается в App.vue без проверки аутентификации

**Решение:**
```typescript
// ✅ После исправления
if (tokenService.isAuthenticated()) {
  syncService.start()
}
```

**Статус:** ✅ Исправлено

---

### Проблема: После logout/login списки не подтягиваются

**Симптомы:**
- После logout IndexedDB пуст
- После login списки не появляются в UI
- В консоли нет sync логов

**Причина:**
- Sync делал early exit когда `pendingOps.length === 0`
- Запрос на сервер не отправлялся

**Решение:**
```typescript
// ❌ До исправления
if (pendingOps.length === 0) {
  return // Early exit
}

// ✅ После исправления
// Всегда отправляем запрос на сервер
const payload = await this.prepareSyncPayload(pendingOps)
```

**Статус:** ✅ Исправлено

---

### Проблема: После logout sync продолжает работать

**Симптомы:**
- После logout RxJS interval продолжает тикать
- Попытки sync для неаутентифицированного пользователя

**Причина:**
- `syncService.stop()` не вызывался при logout

**Решение:**
```typescript
// ✅ После исправления
async logout() {
  syncService.stop()  // Stop auto-sync
  // ... rest of logout
}
```

**Статус:** ✅ Исправлено

---

### Проблема: Списки дублируются после нескольких синхронизаций

**Симптомы:**
- В UI появляются дубликаты списков
- В IndexedDB несколько записей с одинаковым ID

**Причина:**
- `db.lists.put()` с неуникальным ID
- Проблема в schema IndexedDB

**Решение:**
```typescript
// Проверить schema:
lists: '++id, &id, ownerId, title'
//       ^      ^
//       |      └─ Unique index
//       └─ Auto-increment (не использовать)
```

**Статус:** Требует проверки

---

### Проблема: Конфликты не разрешаются

**Симптомы:**
- Изменения не синхронизируются
- В response.conflicts есть ID, но UI не обновляется

**Причина:**
- Version не обновляется после разрешения конфликта

**Решение:**
```typescript
await db.lists.put({
  ...serverList,
  version: serverList.version,  // ✓ Update version
  syncStatus: SyncStatus.SYNCED,
})
```

**Статус:** ✅ Уже реализовано

---

### Проблема: Sync не работает после восстановления соединения

**Симптомы:**
- Offline → Online
- Sync не запускается автоматически

**Причина:**
- Network listener не настроен
- Auth guard блокирует sync

**Решение:**
- Проверить `initializeNetworkListeners()` вызван в constructor
- Проверить `tokenService.isAuthenticated()` возвращает true

**Статус:** ✅ Реализовано

---

## Best Practices

### 1. Всегда проверяйте аутентификацию

```typescript
// ❌ Плохо
syncService.start()

// ✅ Хорошо
if (tokenService.isAuthenticated()) {
  syncService.start()
}
```

---

### 2. Останавливайте sync при logout

```typescript
// ✅ Правильный logout
async logout() {
  syncService.stop()           // Stop sync first
  tokenService.clearTokens()   // Clear tokens
  // ... clear data
}
```

---

### 3. Очищайте lastSyncTimestamp при logout

```typescript
// ✅ Гарантирует full sync при следующем login
localStorage.removeItem('lastSyncTimestamp')
```

---

### 4. Используйте defensive guards

```typescript
// Multiple layers of protection
if (!tokenService.isAuthenticated()) {
  console.log('Sync skipped: not authenticated')
  return  // Graceful exit
}
```

---

### 5. Логируйте все sync events

```typescript
console.log('🔄 Preparing INITIAL SYNC')
console.log('📥 Server sync response:', { listsCount, itemsCount })
console.log('💾 Saving lists to IndexedDB:', count)
console.log('✅ Saved list to IndexedDB:', { id, title })
```

---

## Мониторинг и дебаггинг

### Console Logs

После исправления вы увидите следующие логи:

#### Unauthenticated User (App init)
```
(No sync logs - sync не запускается)
```

#### Login
```
[UserStore] Setting tokens and syncing data...
🔄 Preparing INITIAL SYNC (full data fetch from server)
📥 Server sync response: { listsCount: 5, itemsCount: 12 }
💾 Saving lists to IndexedDB: 5
✅ Saved list to IndexedDB: { id: 'xxx', title: 'Shopping' }
✅ Saved list to IndexedDB: { id: 'yyy', title: 'TODO' }
...
Sync completed successfully
```

#### Auto-Sync (Every 30s)
```
🔄 Preparing INCREMENTAL SYNC (changes since: 2025-11-08T14:30:00.000Z)
📥 Server sync response: { listsCount: 0, itemsCount: 1 }
Sync completed successfully
```

#### Logout
```
[UserStore] Logging out...
(Sync stopped - no more logs)
```

#### Offline
```
Sync skipped: offline
```

---

## Конфигурация

### Настройки Sync Service

```typescript
// Файл: src/shared/config/offline.config.ts

export const OFFLINE_ONLY_MODE = false  // Backend доступен
export const AUTO_SYNC_INTERVAL = 30000 // 30 секунд
export const MAX_SYNC_RETRIES = 3       // Максимум 3 retry
export const SYNC_RETRY_BACKOFF = 1000  // Начальный backoff 1s
```

### Изменение конфигурации

```typescript
// Runtime update
syncService.updateConfig({
  autoSyncInterval: 60000,  // Change to 60 seconds
  maxRetries: 5,            // Increase retries
})
```

---

## Summary

### Ключевые изменения

1. ✅ **App.vue** - Authentication check перед `syncService.start()`
2. ✅ **sync.service.ts** - Authentication guard в методе `sync()`
3. ✅ **sync.service.ts** - Authentication filter в RxJS interval
4. ✅ **user.store.ts** - `syncService.stop()` при logout
5. ✅ **user.store.ts** - Clear `lastSyncTimestamp` при logout

### Результат

- ✅ Нет ошибок для неаутентифицированных пользователей
- ✅ Sync автоматически стартует при login
- ✅ Sync автоматически останавливается при logout
- ✅ Все списки загружаются после login
- ✅ Defense in depth - multiple auth checks
- ✅ Graceful handling всех edge cases

---

## Related Documentation

- [FRONTEND_SYNC_API.md](../FRONTEND_SYNC_API.md) - API документация
- [SYNC_FIX.md](./SYNC_FIX.md) - Исправление logout/login issue
- [OFFLINE_ONLY_MODE.md](./OFFLINE_ONLY_MODE.md) - Offline-first архитектура
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - RxJS migration guide
