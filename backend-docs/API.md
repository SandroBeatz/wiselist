# Wiselist API Documentation

## Table of Contents
- [Overview](#overview)
- [Authentication](#authentication)
- [Real-time Features](#real-time-features)
- [REST API Endpoints](#rest-api-endpoints)
- [WebSocket Events](#websocket-events)
- [Event Sourcing](#event-sourcing)
- [Performance & Monitoring](#performance--monitoring)
- [Error Handling](#error-handling)

## Overview

The Wiselist API is built with NestJS and provides both REST endpoints and WebSocket connections for real-time collaborative list management. The API supports user authentication, list management, and real-time synchronization across multiple clients.

**Base URL:** `http://localhost:3000/api`
**WebSocket URL:** `ws://localhost:3000/lists`

### Key Features
- JWT-based authentication with multiple providers (Email, Google, Apple)
- Real-time collaborative editing via WebSocket
- Event sourcing for conflict resolution
- Multi-layer caching with Redis
- Rate limiting and security measures
- Performance monitoring

## Authentication

All API endpoints (except auth endpoints) require JWT authentication via the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

### Auth Endpoints

#### POST /api/auth/login
Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "profile": {
      "fullName": "John Doe"
    }
  },
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token"
}
```

#### POST /api/auth/register
Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "fullName": "John Doe"
}
```

## Real-time Features

### WebSocket Connection

Connect to the WebSocket server with JWT authentication:

```javascript
import { io } from 'socket.io-client';

const socket = io('ws://localhost:3000/lists', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

### Real-time Events

#### Join List
Join a list room to receive real-time updates.

**Event:** `joinList`
**Payload:**
```json
{
  "listId": "uuid"
}
```

**Response:** `joinedList`
```json
{
  "listId": "uuid",
  "message": "Successfully joined list"
}
```

#### Leave List
Leave a list room.

**Event:** `leaveList`
**Payload:**
```json
{
  "listId": "uuid"
}
```

#### Get Active Users
Get currently active users in a list.

**Event:** `getActiveUsers`
**Payload:**
```json
{
  "listId": "uuid"
}
```

**Response:** `activeUsers`
```json
{
  "listId": "uuid",
  "users": ["userId1", "userId2"],
  "count": 2
}
```

#### Heartbeat
Send heartbeat to maintain connection.

**Event:** `heartbeat`
**Payload:**
```json
{
  "listId": "uuid" // optional
}
```

**Response:** `heartbeatAck`
```json
{
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## REST API Endpoints

### Lists

#### GET /api/lists
Get all lists for the authenticated user.

**Query Parameters:**
- `type` (optional): Filter by list type (TODO, SHOPPING, OTHER)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**
```json
{
  "lists": [
    {
      "id": "uuid",
      "title": "My Todo List",
      "type": "TODO",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "version": 5,
      "_count": {
        "items": 10
      }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

#### GET /api/lists/:id
Get a specific list with its items.

**Response:**
```json
{
  "id": "uuid",
  "title": "My Todo List",
  "type": "TODO",
  "version": 5,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "items": [
    {
      "id": "uuid",
      "content": "Buy groceries",
      "checked": false,
      "order": 1,
      "version": 2,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### POST /api/lists
Create a new list.

**Request:**
```json
{
  "title": "My New List",
  "type": "TODO"
}
```

#### PUT /api/lists/:id
Update a list.

**Request:**
```json
{
  "title": "Updated List Title",
  "type": "SHOPPING"
}
```

#### DELETE /api/lists/:id
Delete a list.

**Response:** `204 No Content`

#### POST /api/lists/:id/sync
Sync list data with differential updates.

**Request:**
```json
{
  "clientVersion": 3,
  "operations": [
    {
      "type": "UPDATE_ITEM",
      "itemId": "uuid",
      "data": {
        "checked": true
      }
    }
  ]
}
```

**Response:**
```json
{
  "serverVersion": 5,
  "conflicts": [],
  "appliedOperations": ["operation1"],
  "delta": {
    "items": [
      {
        "id": "uuid",
        "checked": true,
        "version": 4
      }
    ]
  }
}
```

### List Items

#### GET /api/list-items
Get list items with filtering.

**Query Parameters:**
- `listId`: Filter by list ID
- `checked` (optional): Filter by checked status
- `page` (optional): Page number
- `limit` (optional): Items per page

#### POST /api/list-items
Create a new list item.

**Request:**
```json
{
  "listId": "uuid",
  "content": "New item",
  "order": 1
}
```

#### PUT /api/list-items/:id
Update a list item.

**Request:**
```json
{
  "content": "Updated content",
  "checked": true,
  "order": 2
}
```

#### DELETE /api/list-items/:id
Delete a list item.

**Response:** `204 No Content`

### Events

#### GET /api/lists/:id/events
Get event history for a list.

**Query Parameters:**
- `since` (optional): ISO date string to get events since
- `limit` (optional): Number of events to return

**Response:**
```json
{
  "events": [
    {
      "id": "uuid",
      "eventType": "ITEM_UPDATED",
      "data": {
        "content": "Updated item"
      },
      "version": 4,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "user": {
        "id": "uuid",
        "email": "user@example.com",
        "profile": {
          "fullName": "John Doe"
        }
      }
    }
  ]
}
```

### Monitoring

#### GET /api/monitoring/health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected",
  "redis": "connected"
}
```

#### GET /api/monitoring/metrics
Get performance metrics.

**Response:**
```json
{
  "websocket": {
    "totalConnections": 150,
    "activeConnections": 75,
    "messagesSent": 1000,
    "messagesReceived": 800
  },
  "cache": {
    "hitRate": 0.85,
    "totalRequests": 500,
    "hits": 425,
    "misses": 75
  },
  "database": {
    "connections": 10,
    "queries": 250,
    "avgQueryTime": 15.5
  },
  "memory": {
    "heapUsed": 52428800,
    "heapTotal": 67108864,
    "external": 1024000
  }
}
```

#### GET /api/cache/stats
Get cache statistics.

**Response:**
```json
{
  "list": {
    "count": 50,
    "keys": ["cache:list:uuid1", "cache:list:uuid2"]
  },
  "user_lists": {
    "count": 25,
    "keys": ["cache:user_lists:uuid1"]
  },
  "list_items": {
    "count": 200,
    "keys": ["cache:list_items:uuid1"]
  },
  "active_users": {
    "count": 10,
    "keys": ["cache:active_users:uuid1"]
  }
}
```

## Event Sourcing

The API implements event sourcing for list and list item operations. All changes are recorded as events with versioning for conflict resolution.

### Event Types

#### List Events
- `LIST_CREATED`: List was created
- `LIST_UPDATED`: List properties were updated
- `LIST_DELETED`: List was deleted

#### List Item Events  
- `ITEM_CREATED`: List item was created
- `ITEM_UPDATED`: List item was updated
- `ITEM_DELETED`: List item was deleted
- `ITEM_CHECKED`: List item was checked/unchecked
- `ITEM_REORDERED`: List item order was changed

### Conflict Resolution

When conflicts occur during synchronization:
1. Server compares client version with current version
2. If versions match, changes are applied
3. If versions differ, conflicts are identified
4. Client receives conflict data and latest state
5. Client resolves conflicts and resubmits

## Performance & Monitoring

### Rate Limiting

Rate limits are applied per user:
- `joinList`: 10 requests per minute
- `heartbeat`: 120 requests per minute
- General WebSocket events: 50 requests per minute
- REST API: 100 requests per minute

### Caching Strategy

Multi-layer caching is implemented:
- **List Details**: 5 minutes TTL
- **User Lists**: 5 minutes TTL  
- **List Items**: 3 minutes TTL
- **Active Users**: 30 seconds TTL

### Performance Monitoring

The API tracks:
- WebSocket connection metrics
- Cache hit/miss rates
- Database query performance
- Memory usage
- Real-time user presence

## Error Handling

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `204` - No Content (successful deletion)
- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `403` - Forbidden (access denied)
- `404` - Not Found
- `409` - Conflict (version mismatch)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

### WebSocket Error Events

#### `error`
General error occurred.
```json
{
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

#### `validationError`  
Request validation failed.
```json
{
  "message": "Validation failed",
  "errors": [
    {
      "property": "listId",
      "constraints": {
        "isUuid": "listId must be a UUID"
      }
    }
  ]
}
```

#### `rateLimitExceeded`
Rate limit was exceeded.
```json
{
  "message": "Rate limit exceeded",
  "retryAfter": 60
}
```

### Common Error Responses

#### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": ["title should not be empty"],
  "error": "Bad Request"
}
```

#### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

#### 409 Conflict
```json
{
  "statusCode": 409,
  "message": "Version conflict",
  "conflicts": [
    {
      "field": "title",
      "clientValue": "Client Title",
      "serverValue": "Server Title",
      "serverVersion": 5
    }
  ]
}
```