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

#### Subtask 4.1: Install and Configure RxJS
- Install RxJS: `npm install rxjs`
- Create RxJS services structure in `@shared/services/`
- Set up base reactive service classes
- Configure RxJS operators imports

#### Subtask 4.2: Create Reactive Store Pattern
- Create `@shared/services/reactive-store.service.ts` base class
- Implement BehaviorSubject-based state management
- Add methods for state updates, subscriptions, and cleanup
- Create TypeScript interfaces for reactive state

#### Subtask 4.3: Migrate Lists Store to RxJS
- Convert `useListsStore` to reactive pattern
- Implement BehaviorSubject for lists array
- Add real-time list updates capability
- Maintain backward compatibility with existing components

### Phase 2: Offline-First Architecture (Week 2)

#### Subtask 4.4: Implement Local Storage Cache
- Create `@shared/services/cache.service.ts`
- Implement indexed storage for lists and items
- Add cache synchronization logic
- Handle cache invalidation strategies

#### Subtask 4.5: Create Queue System for Offline Operations
- Enhance existing `request-queue.service.ts` with RxJS
- Implement operation queuing (create, update, delete)
- Add retry mechanisms with exponential backoff
- Handle conflict resolution for simultaneous edits

#### Subtask 4.6: Optimistic Updates Implementation
- Create optimistic update patterns
- Implement rollback mechanisms for failed operations
- Add loading states for background synchronization
- Update UI to reflect optimistic changes

### Phase 3: Real-time Collaboration (Week 3)

#### Subtask 4.7: WebSocket Integration
- Create `@shared/services/websocket.service.ts`
- Implement WebSocket connection management
- Add automatic reconnection logic
- Handle connection state changes

#### Subtask 4.8: Real-time List Updates
- Implement live list synchronization
- Add conflict resolution for concurrent edits
- Create merge strategies for list changes
- Handle user presence indicators

#### Subtask 4.9: Live Item Management
- Real-time item creation/editing/deletion
- Implement operational transformation for text edits
- Add user activity indicators
- Handle simultaneous item modifications

### Phase 4: Performance Optimization (Week 4)

#### Subtask 4.10: Implement Smart Caching
- Add intelligent data prefetching
- Implement memory management for large datasets
- Create data pruning strategies
- Add cache warming for frequently accessed data

#### Subtask 4.11: Background Sync Optimization
- Implement differential sync (only changed data)
- Add bandwidth-aware synchronization
- Create sync priority system
- Optimize for mobile network conditions

#### Subtask 4.12: Testing and Performance Monitoring
- Add RxJS-specific unit tests
- Implement performance monitoring
- Create stress tests for offline scenarios
- Add real-time collaboration tests

### Implementation Priority:
1. **High**: Subtasks 4.1-4.3 (Foundation)
2. **High**: Subtasks 4.4-4.6 (Offline capabilities)
3. **Medium**: Subtasks 4.7-4.9 (Real-time features)
4. **Low**: Subtasks 4.10-4.12 (Optimization)

## Backend Requirements for Future Implementation

### Real-time Infrastructure:
1. **WebSocket Server**: Socket.io or native WebSocket implementation
2. **Message Broker**: Redis for pub/sub messaging
3. **Real-time Database**: PostgreSQL with LISTEN/NOTIFY or MongoDB Change Streams
4. **Event Sourcing**: Store all list operations as events for replay

### API Enhancements:
1. **Differential Sync Endpoints**: 
   - `GET /api/lists/{id}/changes?since={timestamp}`
   - `POST /api/lists/{id}/bulk-update`
2. **Conflict Resolution**: 
   - Last-writer-wins with timestamps
   - Operational transformation for complex conflicts
3. **User Presence**: 
   - `POST /api/lists/{id}/presence`
   - WebSocket events for user join/leave

### Performance Optimizations:
1. **Caching Layer**: Redis for frequently accessed data
2. **CDN Integration**: For static assets and cached responses
3. **Database Optimization**: Indexing for timestamp-based queries
4. **Rate Limiting**: Protect against excessive real-time updates

### Security Considerations:
1. **WebSocket Authentication**: JWT token validation
2. **Permission Checks**: Real-time operation authorization
3. **Rate Limiting**: Prevent spam in collaborative editing
4. **Data Validation**: Server-side validation for all operations
