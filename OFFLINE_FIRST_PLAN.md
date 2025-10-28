# 📋 Offline-First Implementation Plan

## Общий обзор

**Цель:** Внедрить offline-first архитектуру с RxJS, IndexedDB и автоматической синхронизацией для списков и элементов списков.

**Общее время:** ~12-16 дней (при работе в одиночку)

**Приоритет:** High - это core функционал для мобильного приложения

---

## 🎯 Фазы внедрения

### Phase 1: Backend Setup (3-4 дня)
### Phase 2: Frontend Database Layer (2-3 дня)
### Phase 3: RxJS Services (3-4 дня)
### Phase 4: Sync Engine (3-4 дня)
### Phase 5: UI Integration (2-3 дня)
### Phase 6: Testing & Polish (2-3 дня)

---

## Phase 1: Backend Setup (3-4 дня)

### Day 1: Database Schema & Migration

- [ ] **Task 1.1: Update Prisma Schema**
  - Файл: `backend/prisma/schema.prisma`
  - Добавить `version Int @default(0)` в модель `List`
  - Добавить `version Int @default(0)` в модель `ListItem`
  - Добавить индексы для version полей
  - **Acceptance criteria:** Schema валидна, `npx prisma validate` проходит без ошибок

- [ ] **Task 1.2: Create Migration**
  - Команда: `npx prisma migrate dev --name add_version_field`
  - Проверить сгенерированный SQL
  - Убедиться что добавлены NOT NULL DEFAULT 0
  - **Acceptance criteria:** Migration создана, можно откатить и применить снова

- [ ] **Task 1.3: Update Existing Data**
  - Создать data migration script для существующих записей
  - Установить `version = 1` для всех существующих Lists
  - Установить `version = 1` для всех существующих ListItems
  - **Acceptance criteria:** Все существующие записи имеют version >= 1

- [ ] **Task 1.4: Generate Prisma Client**
  - Команда: `npx prisma generate`
  - Проверить что типы обновились
  - **Acceptance criteria:** TypeScript типы включают version field

---

### Day 2: DTOs and Types

- [ ] **Task 1.5: Create Sync DTOs**
  - Файл: `backend/src/lists/dto/sync.dto.ts`
  - Создать `OperationType` enum (CREATE, UPDATE, DELETE)
  - Создать `ListOperationDto` class
  - Создать `ListItemOperationDto` class
  - Создать `SyncRequestDto` class
  - Создать `SyncResponseDto` class
  - Добавить `class-validator` decorators
  - **Acceptance criteria:** Все DTOs с валидацией, компилируются без ошибок

- [ ] **Task 1.6: Add Swagger Documentation**
  - Добавить `@ApiProperty` decorators ко всем DTO полям
  - Добавить примеры в Swagger UI
  - **Acceptance criteria:** Swagger docs генерируются корректно

---

### Day 3: Sync Endpoint - Controller

- [ ] **Task 1.7: Create Sync Controller Method**
  - Файл: `backend/src/lists/lists.controller.ts`
  - Добавить POST `/lists/sync` endpoint
  - Добавить `@UseGuards(JwtAuthGuard)`
  - Добавить `@ApiBearerAuth()`
  - Extract `userId` from `req.user`
  - **Acceptance criteria:** Endpoint доступен, требует авторизацию

- [ ] **Task 1.8: Add Request Validation**
  - Применить `ValidationPipe` к body
  - Проверить лимиты (max 1000 operations)
  - **Acceptance criteria:** Invalid requests возвращают 400 Bad Request

---

### Day 4: Sync Service - Core Logic

- [ ] **Task 1.9: Implement processListOperation**
  - Файл: `backend/src/lists/lists.service.ts`
  - Создать метод `processListOperation()`
  - Обработка CREATE операций
  - Обработка UPDATE операций с version check
  - Обработка DELETE операций
  - **Acceptance criteria:** Все типы операций обрабатываются корректно

- [ ] **Task 1.10: Implement processItemOperation**
  - Создать метод `processItemOperation()`
  - Обработка CREATE операций для items
  - Обработка UPDATE операций с version check
  - Обработка DELETE операций
  - **Acceptance criteria:** Item operations работают, version increments

- [ ] **Task 1.11: Implement Conflict Detection**
  - Создать `resolveListConflict()` метод
  - Создать `resolveItemConflict()` метод
  - Реализовать Last Write Wins по timestamp
  - Добавить логирование конфликтов
  - **Acceptance criteria:** Конфликты детектируются и логируются

- [ ] **Task 1.12: Implement Transaction Support**
  - Обернуть sync logic в `prisma.$transaction()`
  - Обработка rollback при ошибках
  - **Acceptance criteria:** Все операции atomic, rollback работает

- [ ] **Task 1.13: Write Backend Unit Tests**
  - Файл: `backend/src/lists/__tests__/lists.service.spec.ts`
  - Тесты для CREATE operations
  - Тесты для UPDATE operations
  - Тесты для DELETE operations
  - Тесты для conflict detection
  - Тесты для transaction rollback
  - **Acceptance criteria:** 80%+ test coverage для sync logic

---

## Phase 2: Frontend Database Layer (2-3 дня)

### Day 5: Dexie Setup

- [ ] **Task 2.1: Create WiselistDatabase Class**
  - Файл: `src/shared/db/database.ts`
  - Создать класс `WiselistDatabase extends Dexie`
  - Определить таблицы: `lists`, `listItems`, `syncOperations`
  - Определить схемы с индексами
  - **Acceptance criteria:** Database инициализируется без ошибок

- [ ] **Task 2.2: Define Database Types**
  - Создать `LocalList` interface extends `List`
  - Создать `LocalListItem` interface extends `ListItem`
  - Создать `SyncOperation` interface
  - Добавить `SyncStatus` enum
  - Добавить `OperationType` enum
  - **Acceptance criteria:** Все типы экспортированы, используются в коде

- [ ] **Task 2.3: Create Database Instance**
  - Экспортировать singleton `db` instance
  - Инициализировать Dexie observable
  - **Acceptance criteria:** `db` доступна во всех модулях

- [ ] **Task 2.4: Test Database Operations**
  - Файл: `src/shared/db/__tests__/database.spec.ts`
  - Тесты для CRUD operations
  - Тесты для indexes
  - Тесты для live queries
  - **Acceptance criteria:** Database tests проходят

---

### Day 6: Database Migration Utilities

- [ ] **Task 2.5: Create Initial Data Seed**
  - Функция для загрузки начальных данных с сервера
  - Функция для очистки БД
  - **Acceptance criteria:** Можно загрузить initial state

- [ ] **Task 2.6: Create Database Debug Utils**
  - Файл: `src/shared/db/debug.ts`
  - Функция для export database to JSON
  - Функция для import database from JSON
  - Функция для clear all tables
  - **Acceptance criteria:** Debug utils работают в dev mode

---

## Phase 3: RxJS Services (3-4 дня)

### Day 7: List RxJS Service

- [ ] **Task 3.1: Create ListRxService Class**
  - Файл: `src/shared/services/rxjs/list.service.ts`
  - Создать singleton класс
  - Добавить `BehaviorSubject` для lists
  - Добавить `BehaviorSubject` для sync status
  - **Acceptance criteria:** Service инициализируется

- [ ] **Task 3.2: Implement liveQuery Integration**
  - Метод `initializeLiveQuery()`
  - Subscribe to `db.lists` changes
  - Pipe через RxJS operators
  - **Acceptance criteria:** Changes в IndexedDB триггерят updates

- [ ] **Task 3.3: Implement getLists$ Observable**
  - Метод `getLists$()`
  - Filter, map, distinctUntilChanged
  - shareReplay(1) для caching
  - **Acceptance criteria:** Observable работает, updates корректно

- [ ] **Task 3.4: Implement getList$ Observable**
  - Метод `getList$(id: string)`
  - Find по ID
  - **Acceptance criteria:** Single list observable

- [ ] **Task 3.5: Implement createList Method**
  - Метод `createList(title, type, ownerId)`
  - Generate UUID
  - Optimistic add to IndexedDB
  - Add operation to sync queue
  - **Acceptance criteria:** List создается локально мгновенно

- [ ] **Task 3.6: Implement updateList Method**
  - Метод `updateList(id, updates)`
  - Optimistic update в IndexedDB
  - Add UPDATE operation to queue
  - **Acceptance criteria:** Update мгновенный, в queue

- [ ] **Task 3.7: Implement deleteList Method**
  - Метод `deleteList(id)`
  - Optimistic delete from IndexedDB
  - Delete cascade items
  - Add DELETE operation to queue
  - **Acceptance criteria:** Delete работает локально

---

### Day 8: ListItem RxJS Service

- [ ] **Task 3.8: Create ListItemRxService Class**
  - Файл: `src/shared/services/rxjs/list-item.service.ts`
  - Singleton instance
  - **Acceptance criteria:** Service готов

- [ ] **Task 3.9: Implement getListItems$ Observable**
  - Метод `getListItems$(listId)`
  - liveQuery with where clause
  - **Acceptance criteria:** Items для списка reactively обновляются

- [ ] **Task 3.10: Implement createListItem Method**
  - Optimistic create
  - Add to sync queue
  - **Acceptance criteria:** Item создается мгновенно

- [ ] **Task 3.11: Implement toggleListItem Method**
  - Toggle checked field
  - Optimistic update
  - **Acceptance criteria:** Checkbox toggle мгновенный

- [ ] **Task 3.12: Implement updateListItem Method**
  - Update content field
  - **Acceptance criteria:** Content update работает

- [ ] **Task 3.13: Implement deleteListItem Method**
  - Optimistic delete
  - **Acceptance criteria:** Item удаляется локально

---

### Day 9: RxJS Services Testing

- [ ] **Task 3.14: Write ListRxService Tests**
  - Файл: `src/shared/services/rxjs/__tests__/list.service.spec.ts`
  - Test create operations
  - Test update operations
  - Test delete operations
  - Test observable emissions
  - Test queue additions
  - **Acceptance criteria:** 80%+ coverage

- [ ] **Task 3.15: Write ListItemRxService Tests**
  - Файл: `src/shared/services/rxjs/__tests__/list-item.service.spec.ts`
  - Similar tests for items
  - **Acceptance criteria:** 80%+ coverage

---

## Phase 4: Sync Engine (3-4 дня)

### Day 10: Network Listeners & Auto-Sync

- [ ] **Task 4.1: Create SyncService Class**
  - Файл: `src/shared/services/sync/sync.service.ts`
  - Singleton instance
  - `BehaviorSubject` for sync state
  - **Acceptance criteria:** Service инициализируется

- [ ] **Task 4.2: Implement Network Listeners**
  - Subscribe to window 'online' event
  - Subscribe to window 'offline' event
  - Update isOnline state
  - Trigger sync on online
  - **Acceptance criteria:** Network changes детектируются

- [ ] **Task 4.3: Implement Auto-Sync Timer**
  - `interval(30000)` RxJS operator
  - Filter by online status
  - Trigger sync every 30 seconds
  - **Acceptance criteria:** Auto-sync работает в background

- [ ] **Task 4.4: Implement getSyncState$ Observable**
  - Return sync state observable
  - **Acceptance criteria:** Components могут подписаться

---

### Day 11: Sync Logic

- [ ] **Task 4.5: Implement Main sync() Method**
  - Check if online
  - Check if already syncing
  - Get pending operations from IndexedDB
  - Group operations by type
  - Call API POST /lists/sync
  - Process response
  - Clear queue
  - **Acceptance criteria:** Basic sync работает

- [ ] **Task 4.6: Implement Token Refresh**
  - Метод `refreshToken()`
  - Check if token expired
  - Call refresh API
  - Update tokens
  - **Acceptance criteria:** Token refreshes перед sync

- [ ] **Task 4.7: Implement Response Processing**
  - Метод `processSyncResponse(data)`
  - Update lists from server
  - Update items from server
  - Handle conflicts
  - **Acceptance criteria:** Server data корректно применяется

- [ ] **Task 4.8: Implement Retry Logic**
  - Increment retryCount on failure
  - Max 3 retries
  - Exponential backoff
  - **Acceptance criteria:** Failed syncs retry автоматически

---

### Day 12: OT Resolver

- [ ] **Task 4.9: Create OTResolver Class**
  - Файл: `src/shared/services/sync/ot-resolver.ts`
  - Static methods для conflict resolution
  - **Acceptance criteria:** OTResolver готов

- [ ] **Task 4.10: Implement resolveConflict Method**
  - Last Write Wins по timestamp
  - Return shouldApply flag
  - Return transformed operation
  - **Acceptance criteria:** Conflicts разрешаются корректно

- [ ] **Task 4.11: Implement Field-Level Merge**
  - Метод `resolveFieldLevelConflict()`
  - Merge по полям
  - **Acceptance criteria:** Field-level merge работает

- [ ] **Task 4.12: Write OT Resolver Tests**
  - Файл: `src/shared/services/sync/__tests__/ot-resolver.spec.ts`
  - Test Last Write Wins
  - Test field-level merge
  - Test edge cases
  - **Acceptance criteria:** OT logic covered

---

### Day 13: Sync Service Testing

- [ ] **Task 4.13: Write SyncService Unit Tests**
  - Файл: `src/shared/services/sync/__tests__/sync.service.spec.ts`
  - Test network listeners
  - Test auto-sync
  - Test sync logic
  - Test error handling
  - **Acceptance criteria:** Sync service covered

- [ ] **Task 4.14: Mock API for Tests**
  - Create mock API responses
  - Test success scenarios
  - Test error scenarios
  - **Acceptance criteria:** All scenarios tested

---

## Phase 5: UI Integration (2-3 дня)

### Day 14: Vue Composables

- [ ] **Task 5.1: Create useListsRx Composable**
  - Файл: `src/entities/list/composables/useListsRx.ts`
  - Subscribe to lists$
  - Subscribe to syncStatus$
  - onMounted/onUnmounted lifecycle
  - Return reactive refs
  - **Acceptance criteria:** Composable работает в компонентах

- [ ] **Task 5.2: Add CRUD Methods to useListsRx**
  - createList()
  - updateList()
  - deleteList()
  - manualSync()
  - **Acceptance criteria:** Methods вызывают RxJS services

- [ ] **Task 5.3: Create useListItemsRx Composable**
  - Файл: `src/entities/list-item/composables/useListItemsRx.ts`
  - Similar structure
  - Watch listId changes
  - **Acceptance criteria:** Items composable работает

- [ ] **Task 5.4: Add CRUD Methods to useListItemsRx**
  - createItem()
  - toggleItem()
  - updateItem()
  - deleteItem()
  - **Acceptance criteria:** Item methods работают

---

### Day 15: UI Components

- [ ] **Task 5.5: Create SyncStatusIndicator Component**
  - Файл: `src/widgets/SyncStatusIndicator.vue`
  - Subscribe to syncState$
  - Show icon based on status
  - Show pending count badge
  - Rotating animation при syncing
  - **Acceptance criteria:** Status indicator визуально корректен

- [ ] **Task 5.6: Update ListsPage**
  - Файл: `src/pages/lists/ListsPage.vue`
  - Заменить Pinia store на useListsRx
  - Добавить SyncStatusIndicator
  - Добавить pull-to-refresh
  - **Acceptance criteria:** Page работает с RxJS

- [ ] **Task 5.7: Update ListDetailPage**
  - Файл: `src/pages/lists/ListDetailPage.vue`
  - Заменить на useListItemsRx
  - Добавить sync status
  - **Acceptance criteria:** Detail page работает

- [ ] **Task 5.8: Add Toast Notifications**
  - Toast при sync success
  - Toast при sync error
  - Toast при conflicts
  - **Acceptance criteria:** User feedback работает

---

### Day 16: Polish & Edge Cases

- [ ] **Task 5.9: Handle Offline Indicators**
  - Show offline banner
  - Disable sync button when offline
  - **Acceptance criteria:** Offline UX понятен

- [ ] **Task 5.10: Handle Empty States**
  - Empty state for no lists
  - Empty state for no items
  - **Acceptance criteria:** Empty states работают

- [ ] **Task 5.11: Add Loading States**
  - Skeleton loaders
  - Spinner при sync
  - **Acceptance criteria:** Loading UX smooth

- [ ] **Task 5.12: Optimize Animations**
  - Auto-animate для list updates
  - Smooth transitions
  - **Acceptance criteria:** Animations не лагают

---

## Phase 6: Testing & Polish (2-3 дня)

### Day 17: E2E Testing

- [ ] **Task 6.1: Setup E2E Test Environment**
  - Configure Cypress для offline testing
  - Mock API responses
  - **Acceptance criteria:** E2E environment готов

- [ ] **Task 6.2: Write Offline CRUD Tests**
  - Файл: `tests/e2e/offline-sync.spec.ts`
  - Test create list offline
  - Test update list offline
  - Test delete list offline
  - Test sync when back online
  - **Acceptance criteria:** Offline CRUD работает

- [ ] **Task 6.3: Write Conflict Resolution Tests**
  - Test concurrent updates
  - Test Last Write Wins
  - Test conflict notifications
  - **Acceptance criteria:** Conflicts корректно обрабатываются

- [ ] **Task 6.4: Write Token Refresh Tests**
  - Test expired token scenario
  - Test refresh before sync
  - **Acceptance criteria:** Token refresh работает

- [ ] **Task 6.5: Backend E2E Tests**
  - Файл: `backend/test/lists-sync.e2e-spec.ts`
  - Test sync endpoint
  - Test version conflicts
  - Test permissions
  - **Acceptance criteria:** Backend E2E проходят

---

### Day 18: Performance & Optimization

- [ ] **Task 6.6: Performance Profiling**
  - Chrome DevTools Performance tab
  - Measure sync time
  - Measure IndexedDB query time
  - **Acceptance criteria:** No performance bottlenecks

- [ ] **Task 6.7: Optimize Bundle Size**
  - Check RxJS tree-shaking
  - Check Dexie bundle size
  - **Acceptance criteria:** Bundle size приемлемый

- [ ] **Task 6.8: Memory Leak Check**
  - Chrome DevTools Memory tab
  - Check subscription cleanup
  - **Acceptance criteria:** No memory leaks

- [ ] **Task 6.9: Database Query Optimization**
  - Add missing indexes
  - Optimize complex queries
  - **Acceptance criteria:** Queries быстрые

---

### Day 19: Documentation & Final Polish

- [ ] **Task 6.10: Update README**
  - Document offline-first architecture
  - Add setup instructions
  - **Acceptance criteria:** README полный

- [ ] **Task 6.11: Add Code Comments**
  - Comment complex logic
  - Add JSDoc для public methods
  - **Acceptance criteria:** Code well-documented

- [ ] **Task 6.12: Final Manual Testing**
  - Test на реальном устройстве
  - Test все edge cases
  - Test различные network conditions
  - **Acceptance criteria:** All scenarios работают

- [ ] **Task 6.13: Create Migration Guide for Users**
  - Document breaking changes
  - Migration steps
  - **Acceptance criteria:** Users могут migratе

---

## Checklist для Production Deploy

### Pre-Deploy

- [ ] All tests passing (unit + E2E)
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Bundle size acceptable
- [ ] Performance metrics OK
- [ ] Database migrations tested
- [ ] Backup strategy готова

### Deploy Backend

- [ ] Backup production database
- [ ] Run `npx prisma migrate deploy`
- [ ] Verify migration success
- [ ] Run data migration script
- [ ] Deploy new backend code
- [ ] Monitor logs for errors
- [ ] Test sync endpoint manually

### Deploy Frontend

- [ ] Build production bundle
- [ ] Test on staging environment
- [ ] Deploy to production
- [ ] Monitor error tracking (Sentry)
- [ ] Test on real devices
- [ ] Monitor API request success rate

### Post-Deploy

- [ ] Monitor sync success rate
- [ ] Monitor conflict rate
- [ ] Check user feedback
- [ ] Fix critical bugs ASAP
- [ ] Plan iteration improvements

---

## Success Metrics

### Performance Metrics

- **UI Response Time:** < 100ms для всех операций
- **Sync Time:** < 5s для 100 операций
- **IndexedDB Query Time:** < 50ms
- **Network Request Success Rate:** > 95%

### User Experience Metrics

- **Offline Functionality:** 100% CRUD операций работают offline
- **Data Loss:** 0% (все данные должны синхронизироваться)
- **Conflict Rate:** < 1% от всех операций
- **User Complaints:** < 5% по offline функционалу

### Technical Metrics

- **Test Coverage:** > 80% для критичных модулей
- **Bundle Size Increase:** < 200KB
- **Memory Usage:** No leaks
- **Crash Rate:** < 0.1%

---

## Risk Management

### High Risks

**Risk 1: Data Loss при sync errors**
- Mitigation: Retry mechanism, operation queue persistence
- Contingency: Manual sync button, error notifications

**Risk 2: Version conflicts при collaborative editing**
- Mitigation: OT resolver, Last Write Wins
- Contingency: Show conflicts to user, manual resolution

**Risk 3: Performance degradation с large datasets**
- Mitigation: Pagination, incremental sync
- Contingency: Lazy loading, data cleanup

### Medium Risks

**Risk 4: IndexedDB quota exceeded**
- Mitigation: Monitor usage, cleanup old data
- Contingency: Prompt user to clear data

**Risk 5: Token expiry при offline work**
- Mitigation: Refresh token before sync
- Contingency: Re-login prompt

---

## Team Communication

### Daily Standup Topics

- Completed tasks
- Blockers
- Questions for team
- Next tasks

### Code Review Checklist

- [ ] Tests written and passing
- [ ] No console.logs in production code
- [ ] Subscriptions cleaned up
- [ ] Error handling present
- [ ] TypeScript types correct
- [ ] Performance considered

### Definition of Done

- Code written and reviewed
- Unit tests passing
- E2E tests passing (if applicable)
- No TypeScript errors
- No ESLint warnings
- Documented (comments + README)
- Tested on real device
- Merged to main branch

---

## Resources & Links

### Documentation
- [OFFLINE_FIRST_GUIDE.md](OFFLINE_FIRST_GUIDE.md) - Frontend implementation
- [BACKEND_SYNC_GUIDE.md](BACKEND_SYNC_GUIDE.md) - Backend implementation
- [RxJS Documentation](https://rxjs.dev/)
- [Dexie.js Documentation](https://dexie.org/)
- [Operational Transform](https://operational-transformation.github.io/)

### Tools
- Chrome DevTools - Performance & Memory profiling
- Prisma Studio - Database inspection
- Postman - API testing
- Cypress - E2E testing

---

## Notes

- Регулярно коммить прогресс
- Не скипать тесты
- Тестировать на реальных устройствах часто
- Обращаться за помощью при блокерах
- Документировать важные решения

**Good luck! 🚀**
