# WebSocket Event Documentation

## Table of Contents
- [Connection](#connection)
- [Client-to-Server Events](#client-to-server-events)
- [Server-to-Client Events](#server-to-client-events)
- [Event Flow Examples](#event-flow-examples)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Security Considerations](#security-considerations)

## Connection

### Establishing Connection

Connect to the WebSocket server with JWT authentication:

```javascript
import { io } from 'socket.io-client';

const socket = io('ws://localhost:3000/lists', {
  auth: {
    token: 'your_jwt_token'
  },
  transports: ['websocket']
});

// Handle connection events
socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('connect_error', (error) => {
  console.error('Connection failed:', error);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
```

### Authentication Requirements

- Valid JWT token required in `auth.token`
- Token must contain valid user ID and email
- Expired or invalid tokens will result in connection rejection
- Connection will be automatically terminated if token becomes invalid

## Client-to-Server Events

### joinList

Join a list room to receive real-time updates for that list.

**Event Name:** `joinList`

**Payload:**
```typescript
{
  listId: string; // UUID of the list to join
}
```

**Validation:**
- `listId` must be a valid UUID
- User must have access to the list (owner or member)

**Example:**
```javascript
socket.emit('joinList', {
  listId: '550e8400-e29b-41d4-a716-446655440000'
});
```

**Success Response:** [`joinedList`](#joinedlist)
**Error Response:** [`error`](#error) or [`validationError`](#validationerror)

---

### leaveList

Leave a list room to stop receiving updates.

**Event Name:** `leaveList`

**Payload:**
```typescript
{
  listId: string; // UUID of the list to leave
}
```

**Example:**
```javascript
socket.emit('leaveList', {
  listId: '550e8400-e29b-41d4-a716-446655440000'
});
```

**Success Response:** [`leftList`](#leftlist)
**Error Response:** [`error`](#error)

---

### getActiveUsers

Get the list of currently active users in a specific list.

**Event Name:** `getActiveUsers`

**Payload:**
```typescript
{
  listId: string; // UUID of the list
}
```

**Rate Limit:** 30 requests per minute per user

**Example:**
```javascript
socket.emit('getActiveUsers', {
  listId: '550e8400-e29b-41d4-a716-446655440000'
});
```

**Success Response:** [`activeUsers`](#activeusers)
**Error Response:** [`error`](#error) or [`rateLimitExceeded`](#ratelimitexceeded)

---

### heartbeat

Send a heartbeat to maintain connection and update user presence.

**Event Name:** `heartbeat`

**Payload:**
```typescript
{
  listId?: string; // Optional UUID of the list (for presence tracking)
}
```

**Rate Limit:** 120 requests per minute per user

**Example:**
```javascript
// General heartbeat
socket.emit('heartbeat', {});

// Heartbeat with list presence
socket.emit('heartbeat', {
  listId: '550e8400-e29b-41d4-a716-446655440000'
});
```

**Success Response:** [`heartbeatAck`](#heartbeatack)

## Server-to-Client Events

### joinedList

Sent when a user successfully joins a list room.

**Event Name:** `joinedList`

**Payload:**
```typescript
{
  listId: string;
  message: string;
}
```

**Example:**
```javascript
socket.on('joinedList', (data) => {
  console.log(`Joined list ${data.listId}: ${data.message}`);
});
```

**Sample Response:**
```json
{
  "listId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Successfully joined list"
}
```

---

### leftList

Sent when a user successfully leaves a list room.

**Event Name:** `leftList`

**Payload:**
```typescript
{
  listId: string;
  message: string;
}
```

**Example:**
```javascript
socket.on('leftList', (data) => {
  console.log(`Left list ${data.listId}: ${data.message}`);
});
```

---

### activeUsers

Sent in response to `getActiveUsers` request.

**Event Name:** `activeUsers`

**Payload:**
```typescript
{
  listId: string;
  users: string[]; // Array of user IDs
  count: number;   // Total number of active users
}
```

**Example:**
```javascript
socket.on('activeUsers', (data) => {
  console.log(`${data.count} users active in list ${data.listId}:`, data.users);
});
```

**Sample Response:**
```json
{
  "listId": "550e8400-e29b-41d4-a716-446655440000",
  "users": ["user-123", "user-456"],
  "count": 2
}
```

---

### heartbeatAck

Sent in response to heartbeat requests.

**Event Name:** `heartbeatAck`

**Payload:**
```typescript
{
  timestamp: string; // ISO 8601 timestamp
}
```

**Example:**
```javascript
socket.on('heartbeatAck', (data) => {
  console.log('Server heartbeat at:', data.timestamp);
});
```

---

### userJoined

Broadcast to all users in a list when someone joins.

**Event Name:** `userJoined`

**Payload:**
```typescript
{
  listId: string;
  user: {
    id: string;
    email: string;
    fullName: string;
  };
}
```

**Example:**
```javascript
socket.on('userJoined', (data) => {
  console.log(`${data.user.fullName} joined list ${data.listId}`);
});
```

---

### userLeft

Broadcast to all users in a list when someone leaves.

**Event Name:** `userLeft`

**Payload:**
```typescript
{
  listId: string;
  user: {
    id: string;
    email: string;
    fullName: string;
  };
}
```

**Example:**
```javascript
socket.on('userLeft', (data) => {
  console.log(`${data.user.fullName} left list ${data.listId}`);
});
```

---

### listEvent

Broadcast to all users in a list when list data changes occur.

**Event Name:** `listEvent`

**Payload:**
```typescript
{
  listId: string;
  eventType: 'LIST_CREATED' | 'LIST_UPDATED' | 'LIST_DELETED' | 
             'ITEM_CREATED' | 'ITEM_UPDATED' | 'ITEM_DELETED' | 
             'ITEM_CHECKED' | 'ITEM_REORDERED';
  data: any; // Event-specific data
  version: number;
  timestamp: string;
  user: {
    id: string;
    email: string;
    fullName: string;
  };
}
```

**Example:**
```javascript
socket.on('listEvent', (event) => {
  switch (event.eventType) {
    case 'ITEM_CREATED':
      console.log(`${event.user.fullName} added item:`, event.data);
      break;
    case 'ITEM_UPDATED':
      console.log(`${event.user.fullName} updated item:`, event.data);
      break;
    case 'ITEM_CHECKED':
      console.log(`${event.user.fullName} checked/unchecked item:`, event.data);
      break;
    // ... handle other event types
  }
});
```

## Event Flow Examples

### Joining a List

```javascript
// User joins a list
socket.emit('joinList', {
  listId: '550e8400-e29b-41d4-a716-446655440000'
});

// Server responds with confirmation
socket.on('joinedList', (data) => {
  console.log('Successfully joined list');
});

// Other users in the list receive notification
socket.on('userJoined', (data) => {
  console.log(`${data.user.fullName} joined the list`);
});
```

### Real-time List Updates

```javascript
// Listen for real-time events
socket.on('listEvent', (event) => {
  if (event.eventType === 'ITEM_CREATED') {
    // Add new item to UI
    addItemToList(event.data);
  } else if (event.eventType === 'ITEM_UPDATED') {
    // Update existing item in UI
    updateItemInList(event.data);
  } else if (event.eventType === 'ITEM_DELETED') {
    // Remove item from UI
    removeItemFromList(event.data.id);
  }
});
```

### Presence Tracking

```javascript
// Send periodic heartbeats with list presence
setInterval(() => {
  socket.emit('heartbeat', {
    listId: currentListId
  });
}, 30000); // Every 30 seconds

// Get active users
socket.emit('getActiveUsers', {
  listId: currentListId
});

socket.on('activeUsers', (data) => {
  updateActiveUsersList(data.users);
});
```

## Error Handling

### error

General error event sent when operations fail.

**Event Name:** `error`

**Payload:**
```typescript
{
  message: string;
  code?: string;
}
```

**Common Error Codes:**
- `LIST_NOT_FOUND` - List doesn't exist or access denied
- `UNAUTHORIZED` - Authentication failed
- `VALIDATION_ERROR` - Invalid request data

**Example:**
```javascript
socket.on('error', (error) => {
  console.error('WebSocket error:', error.message);
  
  if (error.code === 'LIST_NOT_FOUND') {
    // Handle list not found
    redirectToListSelection();
  } else if (error.code === 'UNAUTHORIZED') {
    // Handle auth error
    redirectToLogin();
  }
});
```

---

### validationError

Sent when request validation fails.

**Event Name:** `validationError`

**Payload:**
```typescript
{
  message: string;
  errors: Array<{
    property: string;
    constraints: Record<string, string>;
  }>;
}
```

**Example:**
```javascript
socket.on('validationError', (error) => {
  console.error('Validation failed:', error.message);
  error.errors.forEach(err => {
    console.error(`Field ${err.property}:`, err.constraints);
  });
});
```

---

### rateLimitExceeded

Sent when rate limits are exceeded.

**Event Name:** `rateLimitExceeded`

**Payload:**
```typescript
{
  message: string;
  retryAfter?: number; // Seconds to wait before retrying
}
```

**Example:**
```javascript
socket.on('rateLimitExceeded', (error) => {
  console.warn('Rate limit exceeded:', error.message);
  
  if (error.retryAfter) {
    setTimeout(() => {
      // Retry the operation
    }, error.retryAfter * 1000);
  }
});
```

## Rate Limiting

Rate limits are applied per user across all WebSocket events:

| Event | Limit | Window |
|-------|-------|---------|
| `joinList` | 10 requests | 1 minute |
| `leaveList` | 20 requests | 1 minute |
| `getActiveUsers` | 30 requests | 1 minute |
| `heartbeat` | 120 requests | 1 minute |
| General events | 50 requests | 1 minute |

### Handling Rate Limits

```javascript
let rateLimited = false;

socket.on('rateLimitExceeded', (error) => {
  rateLimited = true;
  console.warn('Rate limited:', error.message);
  
  // Wait before allowing new requests
  setTimeout(() => {
    rateLimited = false;
  }, (error.retryAfter || 60) * 1000);
});

// Check rate limit before sending events
function safeEmit(eventName, data) {
  if (!rateLimited) {
    socket.emit(eventName, data);
  } else {
    console.warn('Skipping event due to rate limit');
  }
}
```

## Security Considerations

### Authentication
- JWT tokens are validated on every connection
- Tokens must be refreshed before expiration
- Invalid or expired tokens result in immediate disconnection

### Authorization
- Users can only join lists they own or have been granted access to
- List access is validated on every `joinList` request
- Real-time events are only broadcast to authorized users

### Input Validation
- All event payloads are validated using DTOs
- Invalid data triggers `validationError` events
- Malicious or malformed data is rejected

### Rate Limiting
- Prevents DoS attacks and abuse
- Limits are enforced per user, not per connection
- Exceeded limits result in temporary blocks

### Data Sanitization
- All user input is sanitized before processing
- XSS and injection attacks are prevented
- Sensitive data is filtered from responses

### Connection Security
- WebSocket connections use secure protocols in production
- Connection attempts are logged and monitored
- Suspicious activity triggers automatic disconnection

### Example Security Implementation

```javascript
class SecureWebSocketClient {
  constructor(token) {
    this.token = token;
    this.rateLimitBackoff = 1000;
    this.maxRetries = 3;
    this.connect();
  }

  connect() {
    this.socket = io('ws://localhost:3000/lists', {
      auth: { token: this.token },
      transports: ['websocket']
    });

    this.socket.on('connect_error', (error) => {
      if (error.message.includes('Authentication')) {
        // Refresh token and reconnect
        this.refreshTokenAndReconnect();
      }
    });

    this.socket.on('rateLimitExceeded', (error) => {
      // Exponential backoff
      setTimeout(() => {
        this.rateLimitBackoff = Math.min(this.rateLimitBackoff * 2, 60000);
      }, this.rateLimitBackoff);
    });

    this.socket.on('error', (error) => {
      // Log security events
      this.logSecurityEvent(error);
    });
  }

  safeEmit(eventName, data) {
    // Validate data before sending
    if (this.validateEventData(eventName, data)) {
      this.socket.emit(eventName, data);
    }
  }

  validateEventData(eventName, data) {
    // Client-side validation
    switch (eventName) {
      case 'joinList':
        return data.listId && typeof data.listId === 'string';
      // Add validation for other events
    }
  }
}
```