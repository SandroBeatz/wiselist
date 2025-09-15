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

#### Subtask 4.4: Migrate Lists Store to RxJS - **COMPLETED**
- ✅ Convert `useListsStore` to reactive pattern
- ✅ Implement BehaviorSubject for lists array
- ✅ Add real-time list updates using `listEvent` WebSocket events
- ✅ Maintain backward compatibility with existing components
- **Backend Integration**: Use existing `/api/lists` endpoints

**Implemented:**
- Created `ReactiveListsStore` class extending `ReactiveStoreService` with:
  - BehaviorSubject-based state management for lists, loading, and connection status
  - Real-time WebSocket integration for `LIST_CREATED`, `LIST_UPDATED`, `LIST_DELETED` events
  - Optimistic update methods for instant UI feedback
  - Automatic connection management based on authentication state
- Updated `useListsStore` to use reactive store internally while maintaining Pinia interface:
  - Preserved all existing methods: `toggleLoader`, `buildData`, `fetchData`
  - Added new reactive methods: `refresh`, `addListOptimistic`, `updateListOptimistic`, `removeListOptimistic`
  - Added `connected` computed property for WebSocket connection status
- Full backward compatibility with existing components
- Automatic data synchronization when WebSocket events are received
- Proper cleanup and subscription management

feat: migrate lists store to RxJS with real-time WebSocket integration

### Phase 2: Offline-First Architecture (Week 2)

#### Subtask 4.5: Implement Local Storage Cache - **COMPLETED**
- ✅ Create `@shared/services/cache.service.ts`
- ✅ Implement indexed storage for lists and items
- ✅ Add cache synchronization logic using RxJS operators
- ✅ Handle cache invalidation strategies
- **Backend Integration**: Leverage existing Redis caching patterns

**Implemented:**
- **CacheService** (`@shared/services/reactive/cache.service.ts`):
  - Advanced cache with TTL (Time-To-Live), versioning, and localStorage persistence
  - Separate TTLs for lists (5min), items (3min), user lists index (10min)
  - Memory management with configurable cache size limits and automatic cleanup
  - Version-based cache invalidation for conflict resolution
  - Comprehensive cache statistics and monitoring
- **Cache Operators** (`@shared/services/reactive/cache-operators.ts`):
  - `cacheFirst` - Cache-first strategy with API fallback
  - `networkFirst` - Network-first strategy with cache fallback
  - `staleWhileRevalidate` - Return cache immediately, update in background
  - `smartCache` - Configurable strategy selector with version handling
  - List-specific operators for optimized caching patterns
- **ReactiveListsStore Integration**:
  - Cache-first data fetching with automatic fallback to cached data
  - Real-time cache updates from WebSocket events
  - Optimistic updates with cache synchronization
  - Automatic cache management for all list operations
- **Features**:
  - Intelligent cache invalidation based on data versions
  - Offline-first architecture with persistent storage
  - Memory-efficient with automatic cleanup of expired entries
  - Error handling with graceful fallbacks
  - Development logging for debugging

feat: implement comprehensive local storage cache with RxJS operators

#### Subtask 4.6: Differential Sync Implementation - **COMPLETED**
- ✅ Enhanced existing `request-queue.service.ts` with RxJS integration
- ✅ Implemented comprehensive operation queuing using all existing event types
- ✅ Added retry mechanisms with exponential backoff and smart scheduling
- ✅ Integrated with `/api/lists/:id/sync` endpoint with full version control support
- **Backend Integration**: Successfully integrated with existing sync endpoint

**Implemented:**
- **SyncQueueService**: Advanced RxJS-based queue service with:
  - Operation queuing for all CRUD operations (CREATE_LIST, UPDATE_LIST, DELETE_LIST, CREATE_ITEM, etc.)
  - Exponential backoff retry with configurable delays (1s to 30s)
  - Connection status monitoring with automatic offline/online handling
  - Client version management using localStorage for conflict resolution
  - Batch processing of operations grouped by listId
  - Real-time observable state for UI integration
- **SyncOperations**: Helper class with type-safe methods for all list/item operations
- **useSyncQueue**: Vue composable for easy component integration with reactive state
- **Enhanced RequestQueueService**: Added sync queue integration methods
- **Examples**: Complete usage example demonstrating offline-first patterns

**Features:**
- Automatic operation queuing when offline
- Smart retry with connection restoration detection
- Version-based conflict resolution using sync endpoint
- Observable queue status and processing states
- Type-safe operation definitions matching backend event types
- Graceful error handling and rollback mechanisms
- Memory-efficient queue management with cleanup
- Development logging for debugging and monitoring

feat: implement comprehensive differential sync with RxJS queue service

#### Subtask 4.7: Optimistic Updates Implementation - **COMPLETED**
- ✅ Created optimistic update patterns with BehaviorSubject
- ✅ Implemented comprehensive rollback mechanisms for failed operations
- ✅ Added loading states for background synchronization
- ✅ Updated UI components to reflect optimistic changes instantly
- ✅ Integrated with existing event sourcing for intelligent conflict resolution
- **Backend Integration**: Successfully leverages existing WebSocket event sourcing system

**Implemented:**
- **OptimisticUpdatesService**: Advanced optimistic updates service with:
  - BehaviorSubject-based state management for operations and loading states
  - Complete CRUD operation support (lists and items) with instant UI updates
  - Intelligent rollback mechanisms when operations fail or conflict
  - Real-time conflict resolution using WebSocket events
  - Automatic merge strategies for non-overlapping field changes
  - User notification for conflicts requiring manual resolution
- **useOptimisticUpdates**: Vue composable for seamless component integration
- **OptimisticStatus**: UI component showing sync status with retry capabilities
- **Enhanced ReactiveListsStore**: Integration with optimistic updates for full workflow
- **Comprehensive Examples**: Real-world usage patterns and testing scenarios

**Key Features:**
- **Instant UI Updates**: All operations apply immediately for responsive UX
- **Smart Rollback**: Automatic rollback on failure with original data restoration
- **Conflict Resolution**: WebSocket-based conflict detection and resolution
  - Accept server changes (with rollback)
  - Keep local changes (defer to sync)
  - Automatic merge for non-conflicting fields
  - User intervention for complex conflicts
- **Loading States**: Per-entity loading indicators for background operations
- **Retry Management**: Failed operation retry with exponential backoff
- **Memory Management**: Automatic cleanup of completed operations
- **Development Support**: Comprehensive logging and debugging tools

**Conflict Resolution Strategies:**
- **Timestamp-based**: Newer changes typically win
- **Operation-specific**: DELETE operations cancel conflicting updates
- **Field-level merging**: Non-overlapping changes are automatically merged
- **User intervention**: Complex conflicts defer to user choice
- **Version control**: Integrates with server-side versioning system

feat: implement comprehensive optimistic updates with conflict resolution

### Phase 3: Real-time Collaboration (Week 3)

#### Subtask 4.8: Real-time List Updates Integration - **COMPLETED**
- ✅ Implemented live list synchronization using `listEvent` WebSocket events
- ✅ Handled all existing event types: `LIST_CREATED`, `LIST_UPDATED`, `LIST_DELETED`
- ✅ Created intelligent merge strategies for list changes with version control
- ✅ Integrated with existing event sourcing system with comprehensive version tracking
- **Backend Integration**: Successfully leverages existing WebSocket event sourcing with advanced conflict resolution

**Implemented:**
- **RealTimeListSyncService**: Advanced real-time synchronization service with:
  - Live event processing with ordered queue management
  - Intelligent conflict detection and resolution strategies
  - Version-based synchronization with automatic ordering
  - Multiple merge strategies: server_wins, client_wins, merge_fields, manual_resolution
  - User presence tracking and collaboration features
  - Automatic sync error handling and retry mechanisms
  - Memory-efficient event processing with cleanup
- **useRealTimeSync**: Vue composable for real-time collaboration features
- **Enhanced ReactiveListsStore**: Full integration with real-time sync service
- **Collaboration Example**: Complete real-world usage demonstration

**Advanced Features:**
- **Live Synchronization**: Instant list updates across all connected users
- **Intelligent Conflict Resolution**: 4 sophisticated resolution strategies
  - **Server Wins**: Accept newer server changes (timestamp-based)
  - **Client Wins**: Preserve local changes when appropriate
  - **Field Merging**: Automatic merge for non-overlapping field changes
  - **Manual Resolution**: User intervention for complex conflicts
- **Version Control**: Complete version tracking with proper ordering
- **Event Sourcing Integration**: Seamless integration with existing backend event system
- **User Presence**: Real-time user activity tracking and collaboration indicators
- **Performance Optimization**: Event queuing, deduplication, and memory management

**Collaboration Features:**
- **Live User Presence**: See who's online and actively collaborating
- **Activity Tracking**: Real-time notifications of user actions
- **Conflict Notifications**: Immediate alerts for conflicts requiring resolution
- **Force Sync**: Manual synchronization when needed
- **Activity Analytics**: Detailed insights into collaboration patterns
- **Multi-user Support**: Optimized for concurrent editing scenarios

**Merge Strategy Intelligence:**
- **Timestamp Analysis**: Compare operation times for precedence
- **Field-level Analysis**: Detect overlapping vs. non-overlapping changes
- **Operation Type Logic**: Special handling for delete operations
- **Automatic Merging**: Non-conflicting changes merge automatically
- **User Control**: Manual resolution for complex scenarios
- **Rollback Support**: Automatic rollback on merge failures

feat: implement advanced real-time list synchronization with intelligent conflict resolution

#### Subtask 4.9: Real-time Item Management - **COMPLETED**
- ✅ Handle item WebSocket events: `ITEM_CREATED`, `ITEM_UPDATED`, `ITEM_DELETED`, `ITEM_CHECKED`, `ITEM_REORDERED`
- ✅ Implement conflict resolution using server-side version control
- ✅ Add user activity indicators using `userJoined`/`userLeft` events
- **Backend Integration**: Successfully integrated with existing event broadcasting system

**Implemented:**
- **RealTimeItemSyncService**: Comprehensive service for real-time item management with:
  - Complete handling of all 5 item WebSocket event types with proper validation
  - Advanced conflict detection and resolution strategies (server_wins, client_wins, merge_fields, manual_resolution)
  - Version-based synchronization with intelligent ordering and queue management
  - User activity tracking with editing sessions and presence indicators
  - Optimistic updates integration with automatic rollback on conflicts
  - Real-time collaboration features with active user monitoring
- **Advanced Features**:
  - **Smart Conflict Resolution**: 4 resolution strategies with field-level analysis
  - **Version Control**: Server-side version tracking with proper ordering
  - **Collaborative Editing**: Real-time user presence and editing session tracking
  - **Reorder Management**: Special handling for ITEM_REORDERED events with debouncing
  - **Performance Optimization**: Event queuing, deduplication, and memory management
  - **Error Handling**: Comprehensive error recovery and sync state monitoring
- **Vue Integration**: Enhanced `useRealTimeItemSync` composable for seamless Vue component integration
- **Comprehensive Examples**: 6 detailed usage examples covering all functionality patterns
- **Cache Integration**: Full integration with existing cache service for efficient data management
- **WebSocket Integration**: Complete integration with existing WebSocket service and authentication

**Key Features:**
- **Real-time Synchronization**: Instant item updates across all connected users
- **Intelligent Conflict Resolution**: Automatic and manual resolution strategies
- **Collaborative Editing**: Live editing indicators and user presence tracking  
- **Optimistic Updates**: Instant UI feedback with server reconciliation
- **Version Control**: Complete version tracking for conflict-free synchronization
- **Performance Optimized**: Efficient event processing and memory management
- **Error Recovery**: Robust error handling with automatic retry mechanisms

feat: implement comprehensive real-time item management with collaboration features

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
