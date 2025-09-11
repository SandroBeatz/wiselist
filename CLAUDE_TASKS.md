# CLAUDE_TASKS.md

## T[ask 1 (Редактирование]() профиля) - **DONE**

Контекст: 
- [SettingsProfile](src/pages/SettingsProfile) есть страница просто с данными

Описание:
- Нужно сделать форму для редактирования Имени, емайла и смена пароля
- Так же смена аватарки, если нет урла аватарки, то выбираем из списка разных аватарок. можно пока просто цвета, и будет сохранятся как avatar_icon

Инструкции: 
- придерживайся структуре FSD
- Используй ionic компоненты с импортами

**Выполнено:**
- Создана полноценная форма редактирования профиля с валидацией
- Добавлен выбор аватара из цветовых вариантов (8 цветов)
- Реализована смена имени, email и пароля
- Добавлена feature Profile с композаблом useEditProfileForm
- Обновлен user store с методами updateProfile и changePassword
- Добавлены API методы для обновления профиля
- Интегрированы toast уведомления об успехе/ошибке

feat: add profile editing form with avatar colors and validation

Правки - **ВЫПОЛНЕНО:**
- ✅ должно быть 3 формы
- ✅ 1 аватарка и имя
- ✅ 2 емеил
- ✅ 3 смена пароля
- ✅ По дизайну убери тени и отступы
- ✅ форма аватарки и имени должна быть сразу, далее 2 лист айтема - сменить эмаил и сменить пароль. Будет открывать попап для каждой формы

**Реализовано:**
- Разделено на 3 отдельные формы
- Основная форма: аватар + имя (сразу видна, редактируется inline)
- Два ion-item с кнопками для смены email и пароля
- Модальные попапы для смены email и пароля с полной валидацией
- Убраны тени, минимизированы отступы
- Создан отдельный composable useProfileAvatarForm для avatar+name
- Два новых компонента: ChangeEmailDialog и ChangePasswordDialog

refactor: split profile editing into 3 separate forms with modal dialogs

## Task 2 (Create list component)

Context: 
- There is a good styled list in the settings page

Description:
- I need global component for this list
- Prepare types for props
- Action use in the props
- Add props list - create the structure the same
- In the item add props detail, end, icon, label, caption 
- Follow FSD structure

## Task 3 (rxjs preparation) - **DONE**

Context:
- I have a good job between frontend and backend using rest api. As it is a mobile app and request answers now is very long.
- It should work like this. The mobile app should work fast, reactive using all actions (creating, editing, deleting). If connection is lost, the app should work.
  Some users can work on the one list, it should be reactive. If someone has changed something in the list, another user should see it.

Description:
- Analyze project (structure, api working, versions)
- Why should i implement rxjs? How should i use rxjs
- Create a plan RXsj implementation step by step
- Create a new task here with sub tasks for implementation rxjs
- Describe final result for backend implementation in the future

**Analysis Completed:**

### Current Project Analysis:
1. **Architecture**: Feature-Sliced Design (FSD) with Vue 3 + Ionic + Capacitor
2. **State Management**: Pinia stores for lists and user management
3. **API Layer**: Axios with automatic token refresh and request queuing
4. **Current Issues**: 
   - Long API response times affecting UX
   - No offline capability
   - No real-time collaboration features
   - Manual data refresh required

### Why Implement RxJS:
1. **Reactive State Management**: Real-time updates across components
2. **Offline-First**: Local caching with background sync
3. **Collaboration**: Live updates when multiple users edit same list
4. **Performance**: Optimistic updates with rollback capability
5. **Better UX**: Instant feedback, background operations

### How to Use RxJS:
- BehaviorSubject for state management (current values + reactivity)
- Observables for API responses and real-time events
- Operators for data transformation and caching
- WebSocket integration for real-time collaboration

feat: complete RxJS analysis and create implementation roadmap

## Task 4 (RxJS Implementation) - **PENDING**

### Phase 1: Foundation Setup (Week 1)

#### Subtask 4.1: Install and Configure RxJS - **COMPLETED**
- ✅ Install RxJS: `npm install rxjs` (already installed v7.8.2)
- ✅ Create RxJS services structure in `@shared/services/reactive/`
- ✅ Set up base reactive service classes (`BaseReactiveService`, `ReactiveStoreService`)
- ✅ Configure RxJS operators imports and configuration
- **Backend Integration**: API already supports real-time via WebSocket

**Implemented:**
- Created `/src/shared/services/reactive/` directory structure
- Implemented `BaseReactiveService` with error handling, loading states, and lifecycle management
- Implemented `ReactiveStoreService` with BehaviorSubject-based state management and versioning
- Added centralized operators configuration for consistent imports
- Added reactive configuration with timeouts, retry logic, and environment-based logging
- Created index file for easy imports using `@shared` path alias

feat: implement RxJS foundation with base reactive services and configuration

#### Subtask 4.2: Create Reactive Store Pattern - **COMPLETED**
- ✅ Create `@shared/services/reactive-store.service.ts` base class
- ✅ Implement BehaviorSubject-based state management
- ✅ Add methods for state updates, subscriptions, and cleanup
- ✅ Create TypeScript interfaces for reactive state
- **Backend Integration**: Leverage existing event sourcing system

**Implemented:**
- Enhanced `ReactiveStoreService` class with full state management capabilities
- Added state versioning, optimistic updates, and rollback mechanisms
- Created comprehensive example implementation (`ReactiveListsStore`)
- Implemented derived observables, filtering, and data transformation patterns
- Added async operation handling with loading states and error management
- Created test examples demonstrating practical usage patterns
- Full TypeScript support with generic types and strict typing

feat: implement comprehensive reactive store pattern with examples

#### Subtask 4.3: WebSocket Service Integration - **COMPLETED**
- ✅ Create `@shared/services/websocket.service.ts` using Socket.io client
- ✅ Implement authentication with JWT tokens
- ✅ Add connection management with auto-reconnection
- ✅ Handle existing WebSocket events: `joinList`, `leaveList`, `heartbeat`, `getActiveUsers`
- **Backend Integration**: Use existing Socket.io server at `/lists` namespace

**Implemented:**
- Comprehensive `WebSocketService` with Socket.io client integration
- JWT token authentication with automatic token attachment
- Auto-reconnection with exponential backoff and max retry attempts
- Complete event handling for all backend WebSocket events:
  - Connection events: `connect`, `disconnect`, `connect_error`
  - Authentication events: `authenticated`, `unauthorized`
  - List events: `listEvent` (LIST_CREATED, LIST_UPDATED, LIST_DELETED, ITEM_*)
  - User presence: `userJoined`, `userLeft`, `activeUsers`
- `AuthWebSocketService` for authentication-based connection management
- Reactive state management with RxJS observables
- Environment-based configuration and logging
- Singleton instances ready for app-wide usage

feat: implement complete WebSocket service with authentication and event handling

#### Subtask 4.4: Migrate Lists Store to RxJS
- Convert `useListsStore` to reactive pattern
- Implement BehaviorSubject for lists array
- Add real-time list updates using `listEvent` WebSocket events
- Maintain backward compatibility with existing components
- **Backend Integration**: Use existing `/api/lists` endpoints

### Phase 2: Offline-First Architecture (Week 2)

#### Subtask 4.5: Implement Local Storage Cache
- Create `@shared/services/cache.service.ts`
- Implement indexed storage for lists and items
- Add cache synchronization logic using RxJS operators
- Handle cache invalidation strategies
- **Backend Integration**: Leverage existing Redis caching patterns

#### Subtask 4.6: Differential Sync Implementation
- Enhance existing `request-queue.service.ts` with RxJS
- Implement operation queuing using existing event types
- Add retry mechanisms with exponential backoff
- **Backend Integration**: Use `/api/lists/:id/sync` endpoint with version control

#### Subtask 4.7: Optimistic Updates Implementation
- Create optimistic update patterns with BehaviorSubject
- Implement rollback mechanisms for failed operations
- Add loading states for background synchronization
- Update UI to reflect optimistic changes
- **Backend Integration**: Use existing event sourcing for conflict resolution

### Phase 3: Real-time Collaboration (Week 3)

#### Subtask 4.8: Real-time List Updates Integration
- Implement live list synchronization using `listEvent` WebSocket events
- Handle all existing event types: `LIST_CREATED`, `LIST_UPDATED`, `LIST_DELETED`
- Create merge strategies for list changes with version control
- **Backend Integration**: Use existing event sourcing system with version tracking

#### Subtask 4.9: Real-time Item Management
- Handle item WebSocket events: `ITEM_CREATED`, `ITEM_UPDATED`, `ITEM_DELETED`, `ITEM_CHECKED`, `ITEM_REORDERED`
- Implement conflict resolution using server-side version control
- Add user activity indicators using `userJoined`/`userLeft` events
- **Backend Integration**: Use existing event broadcasting system

#### Subtask 4.10: User Presence System
- Implement user presence tracking using `activeUsers` events
- Add periodic heartbeat with `listId` parameter
- Show active users with real-time updates
- Handle connection state changes
- **Backend Integration**: Use existing presence tracking with 30-second TTL

### Phase 4: Performance Optimization (Week 4)

#### Subtask 4.11: Smart Caching Integration
- Add intelligent data prefetching using RxJS operators
- Implement memory management for large datasets
- Create data pruning strategies for mobile optimization
- **Backend Integration**: Align with existing Redis TTL policies (lists: 5min, items: 3min)

#### Subtask 4.12: Advanced Sync Optimization
- Implement bandwidth-aware synchronization using connection observers
- Create sync priority system for mobile networks
- Add batch operations for multiple changes
- **Backend Integration**: Use existing `/api/lists/:id/events` for event history

#### Subtask 4.13: Monitoring and Testing
- Add RxJS-specific unit tests for reactive stores
- Implement client-side performance monitoring
- Create stress tests for offline scenarios
- Add real-time collaboration tests
- **Backend Integration**: Use existing `/api/monitoring/metrics` endpoint

### Implementation Priority (Updated):
1. **High**: Subtasks 4.1-4.4 (Foundation + WebSocket)
2. **High**: Subtasks 4.5-4.7 (Offline capabilities)
3. **Medium**: Subtasks 4.8-4.10 (Real-time features)
4. **Low**: Subtasks 4.11-4.13 (Optimization)

### Required Dependencies:
- `npm install rxjs socket.io-client`
- Socket.io client for WebSocket connection
- RxJS operators for reactive programming

## Backend Status - **ALREADY IMPLEMENTED** ✅

The backend already provides all necessary infrastructure for RxJS implementation:

### ✅ Real-time Infrastructure:
- **WebSocket Server**: Socket.io server at `/lists` namespace
- **Event Sourcing**: Complete event system with 7 event types
- **Version Control**: Built-in versioning for conflict resolution
- **User Presence**: Active user tracking with 30-second TTL

### ✅ API Endpoints Available:
- **Differential Sync**: `POST /api/lists/:id/sync` with version control
- **Event History**: `GET /api/lists/:id/events` for replay capability
- **Monitoring**: `/api/monitoring/health` and `/api/monitoring/metrics`
- **Cache Stats**: `GET /api/cache/stats` for performance monitoring

### ✅ WebSocket Events Available:
- **Connection**: Authentication, rate limiting, auto-reconnection
- **List Management**: `joinList`, `leaveList`, `listEvent` broadcasts
- **Presence**: `userJoined`, `userLeft`, `activeUsers`, `heartbeat`
- **Error Handling**: Comprehensive error events and validation

### ✅ Security & Performance:
- **JWT Authentication**: Token validation on all connections
- **Rate Limiting**: Per-user limits (10-120 req/min depending on event)
- **Redis Caching**: Multi-layer caching with intelligent TTL
- **Conflict Resolution**: Server-side version control and event sourcing

### ✅ Production Ready:
- **Monitoring**: Health checks, metrics, logging
- **Scaling**: Designed for horizontal scaling
- **Docker Support**: Production deployment ready
- **Error Handling**: Comprehensive error responses and logging

**Result**: Frontend RxJS implementation can immediately connect to existing backend infrastructure with no backend changes required.
