# Backend Implementation Plan - Wiselist Real-Time Sharing

## Overview

This plan covers backend optimizations for Wiselist to enable real-time sharing with WebSocket support.

**Total Effort:** ~22 hours
**Timeline:** Week 1

---

## Phase 1: Fix N+1 Queries & Add Pagination

**Effort:** 4 hours
**Priority:** HIGH (блокирует performance)

### Problem

Current sync endpoint in `backend/src/list/list.service.ts` делает N+1 queries:
1. Fetches all lists (1 query)
2. For EACH list, fetches items separately (N queries)

For 100 lists with items → 101 database queries → slow sync (3+ seconds)

### Solution

Use Prisma `include` to JOIN in single query.

### Files to Modify

**File:** `backend/src/list/list.service.ts`

**Current Implementation:**
```typescript
async sync(userId: string, payload: SyncPayload): Promise<SyncResponse> {
  // Step 1: Get all user's lists (1 query)
  const lists = await this.prisma.list.findMany({
    where: { ownerId: userId }
  })

  // Step 2: For each list, get items (N queries) ❌ BAD
  for (const list of lists) {
    list.items = await this.prisma.listItem.findMany({
      where: { listId: list.id }
    })
  }

  return { lists, items: [], serverTimestamp: Date.now() }
}
```

**New Implementation:**
```typescript
async sync(userId: string, payload: SyncPayload): Promise<SyncResponse> {
  // Single query with JOIN ✅ GOOD
  const lists = await this.prisma.list.findMany({
    where: {
      OR: [
        { ownerId: userId }, // Lists owned by user
        { shares: { some: { userId: userId } } } // Lists shared with user
      ]
    },
    include: {
      items: {
        orderBy: { createdAt: 'desc' }
      },
      shares: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  fullName: true,
                  avatar: true
                }
              }
            }
          }
        }
      },
      owner: {
        select: {
          id: true,
          email: true,
          profile: {
            select: {
              fullName: true,
              avatar: true
            }
          }
        }
      }
    },
    take: 100, // Pagination limit
    skip: payload.offset || 0, // Pagination offset
    orderBy: { updatedAt: 'desc' }
  })

  // Transform shares to match frontend format
  const transformedLists = lists.map(list => ({
    ...list,
    shares: list.shares.map(share => ({
      id: share.user.id,
      email: share.user.email,
      fullName: share.user.profile?.fullName || null,
      avatar: share.user.profile?.avatar || null
    }))
  }))

  return {
    lists: transformedLists,
    hasMore: lists.length === 100, // Indicates more data available
    serverTimestamp: Date.now()
  }
}
```

### Additional Changes

**1. Add pagination support to SyncPayload:**

File: `backend/src/list/dto/sync.dto.ts`

```typescript
export class SyncPayloadDto {
  @IsOptional()
  @IsNumber()
  offset?: number // For pagination

  @IsOptional()
  @IsNumber()
  limit?: number // For pagination (default 100)

  @IsOptional()
  @IsArray()
  listOperations?: ListOperationDto[]

  @IsOptional()
  @IsArray()
  itemOperations?: ItemOperationDto[]

  @IsOptional()
  @IsNumber()
  lastSyncTimestamp?: number
}
```

**2. Add incremental sync support:**

```typescript
async sync(userId: string, payload: SyncPayload): Promise<SyncResponse> {
  const query: any = {
    where: {
      OR: [
        { ownerId: userId },
        { shares: { some: { userId: userId } } }
      ]
    },
    include: { /* ... */ },
    take: payload.limit || 100,
    skip: payload.offset || 0
  }

  // Incremental sync: only fetch updated lists
  if (payload.lastSyncTimestamp) {
    query.where.AND = [
      {
        updatedAt: {
          gte: new Date(payload.lastSyncTimestamp)
        }
      }
    ]
  }

  const lists = await this.prisma.list.findMany(query)
  // ...
}
```

### Testing

**Unit Tests:**

File: `backend/src/list/list.service.spec.ts`

```typescript
describe('ListService.sync', () => {
  it('should fetch lists with items in single query', async () => {
    const spy = jest.spyOn(prisma.list, 'findMany')

    await service.sync(userId, {})

    expect(spy).toHaveBeenCalledTimes(1) // Only 1 query!
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          items: expect.anything(),
          shares: expect.anything()
        })
      })
    )
  })

  it('should support pagination', async () => {
    await service.sync(userId, { offset: 100, limit: 50 })

    expect(prisma.list.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50,
        skip: 100
      })
    )
  })

  it('should support incremental sync', async () => {
    const lastSync = Date.now() - 60000 // 1 minute ago

    await service.sync(userId, { lastSyncTimestamp: lastSync })

    expect(prisma.list.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [{ updatedAt: { gte: expect.any(Date) } }]
        })
      })
    )
  })
})
```

**E2E Tests:**

File: `backend/test/sync.e2e-spec.ts`

```typescript
describe('Sync API (e2e)', () => {
  it('should sync 100 lists with items in <500ms', async () => {
    // Create 100 lists with 10 items each
    const lists = await createTestLists(100, 10)

    const start = Date.now()
    const response = await request(app.getHttpServer())
      .post('/lists/sync')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(200)

    const duration = Date.now() - start

    expect(duration).toBeLessThan(500) // Must be <500ms
    expect(response.body.lists).toHaveLength(100)
    expect(response.body.lists[0].items).toBeDefined()
  })
})
```

### Acceptance Criteria

- [ ] Sync endpoint uses Prisma `include` (no separate queries for items)
- [ ] Pagination works (100 lists per request by default)
- [ ] Incremental sync works (only updated lists since lastSyncTimestamp)
- [ ] Shared lists included in response (OR query)
- [ ] Unit tests pass (100% coverage for sync method)
- [ ] E2E test confirms sync time <500ms for 100 lists
- [ ] No N+1 query warnings in database logs

---

## Phase 2: Implement WebSocket Gateway

**Effort:** 12 hours
**Priority:** CRITICAL (enables real-time sharing)

### Problem

No real-time updates when shared list is modified. Changes only visible after sync (every 30 seconds).

### Solution

Implement NestJS WebSocket Gateway using Socket.io for real-time bidirectional communication.

### Architecture

```
Frontend (Socket.io Client)
    ↓ connect (with JWT token)
WebSocket Gateway
    ↓ subscribe:list
Room-based Broadcasting
    ↓ list:updated, item:updated
All Subscribed Clients
```

### Dependencies

```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
npm install -D @types/socket.io
```

### Files to Create

#### 1. `backend/src/sharing/sharing.gateway.ts`

```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { Logger, UseGuards } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../prisma/prisma.service'
import { WsJwtGuard } from './guards/ws-jwt.guard'

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/sharing', // Optional: separate namespace
})
export class SharingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(SharingGateway.name)

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  /**
   * Handle new WebSocket connection
   */
  async handleConnection(client: Socket) {
    try {
      // Extract JWT token from handshake
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1]

      if (!token) {
        this.logger.warn(`Client ${client.id} rejected: no token`)
        client.disconnect()
        return
      }

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      })

      // Attach user to socket
      client.data.userId = payload.sub
      client.data.email = payload.email

      this.logger.log(`Client connected: ${client.id} (user: ${payload.email})`)
    } catch (error) {
      this.logger.error(`Client ${client.id} auth failed:`, error.message)
      client.disconnect()
    }
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id} (user: ${client.data.email})`)
  }

  /**
   * Subscribe to list updates
   */
  @SubscribeMessage('subscribe:list')
  async subscribeToList(
    @MessageBody() listId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId

    // Verify user has access to this list
    const list = await this.prisma.list.findFirst({
      where: {
        id: listId,
        OR: [
          { ownerId: userId },
          { shares: { some: { userId } } },
        ],
      },
    })

    if (!list) {
      this.logger.warn(`User ${userId} attempted to subscribe to list ${listId} without access`)
      return { error: 'Access denied to this list' }
    }

    // Join room for this list
    client.join(`list:${listId}`)

    this.logger.log(`User ${userId} subscribed to list ${listId}`)

    return { event: 'subscribed', listId }
  }

  /**
   * Unsubscribe from list updates
   */
  @SubscribeMessage('unsubscribe:list')
  async unsubscribeFromList(
    @MessageBody() listId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`list:${listId}`)

    this.logger.log(`User ${client.data.userId} unsubscribed from list ${listId}`)

    return { event: 'unsubscribed', listId }
  }

  /**
   * Broadcast list update to all subscribers
   * Called by ListService after CRUD operations
   */
  notifyListUpdate(listId: string, data: any) {
    this.logger.log(`Broadcasting list update for ${listId} to room list:${listId}`)

    this.server.to(`list:${listId}`).emit('list:updated', {
      listId,
      data,
      timestamp: Date.now(),
    })
  }

  /**
   * Broadcast item update to all subscribers
   * Called by ListItemService after CRUD operations
   */
  notifyItemUpdate(listId: string, itemId: string, data: any) {
    this.logger.log(`Broadcasting item update for ${itemId} in list ${listId}`)

    this.server.to(`list:${listId}`).emit('item:updated', {
      listId,
      itemId,
      data,
      timestamp: Date.now(),
    })
  }

  /**
   * Broadcast share added
   */
  notifyShareAdded(listId: string, shareData: any) {
    this.server.to(`list:${listId}`).emit('share:added', {
      listId,
      share: shareData,
      timestamp: Date.now(),
    })
  }

  /**
   * Broadcast share removed
   */
  notifyShareRemoved(listId: string, userId: string) {
    this.server.to(`list:${listId}`).emit('share:removed', {
      listId,
      userId,
      timestamp: Date.now(),
    })
  }
}
```

#### 2. `backend/src/sharing/sharing.module.ts`

```typescript
import { Module } from '@nestjs/common'
import { SharingGateway } from './sharing.gateway'
import { JwtModule } from '@nestjs/jwt'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
    PrismaModule,
  ],
  providers: [SharingGateway],
  exports: [SharingGateway],
})
export class SharingModule {}
```

#### 3. `backend/src/app.module.ts` (modify)

```typescript
import { SharingModule } from './sharing/sharing.module'

@Module({
  imports: [
    // ... existing imports
    SharingModule, // Add this
  ],
})
export class AppModule {}
```

### Integrate with ListService

**File:** `backend/src/list/list.service.ts`

```typescript
import { SharingGateway } from '../sharing/sharing.gateway'

@Injectable()
export class ListService {
  constructor(
    private prisma: PrismaService,
    private sharingGateway: SharingGateway, // Inject gateway
  ) {}

  async createList(userId: string, dto: CreateListDto) {
    const list = await this.prisma.list.create({
      data: {
        ...dto,
        ownerId: userId,
      },
      include: {
        items: true,
        shares: { include: { user: true } },
      },
    })

    // Notify WebSocket subscribers
    this.sharingGateway.notifyListUpdate(list.id, list)

    return list
  }

  async updateList(listId: string, userId: string, dto: UpdateListDto) {
    // Verify access
    const list = await this.verifyAccess(listId, userId)

    const updated = await this.prisma.list.update({
      where: { id: listId },
      data: dto,
      include: {
        items: true,
        shares: { include: { user: true } },
      },
    })

    // Notify WebSocket subscribers
    this.sharingGateway.notifyListUpdate(listId, updated)

    return updated
  }

  async deleteList(listId: string, userId: string) {
    // Verify access
    await this.verifyAccess(listId, userId)

    await this.prisma.list.delete({ where: { id: listId } })

    // Notify WebSocket subscribers
    this.sharingGateway.notifyListUpdate(listId, { deleted: true })
  }

  // Similar for ListItemService
}
```

### Testing

#### Unit Tests: `backend/src/sharing/sharing.gateway.spec.ts`

```typescript
import { Test } from '@nestjs/testing'
import { SharingGateway } from './sharing.gateway'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../prisma/prisma.service'
import { Socket } from 'socket.io'

describe('SharingGateway', () => {
  let gateway: SharingGateway
  let mockSocket: Partial<Socket>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SharingGateway,
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn().mockResolvedValue({ sub: 'user-123', email: 'test@example.com' }),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            list: {
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile()

    gateway = module.get(SharingGateway)

    mockSocket = {
      id: 'socket-123',
      data: {},
      join: jest.fn(),
      leave: jest.fn(),
      disconnect: jest.fn(),
      handshake: {
        auth: { token: 'valid-token' },
      },
    }
  })

  it('should authenticate client on connection', async () => {
    await gateway.handleConnection(mockSocket as Socket)

    expect(mockSocket.data.userId).toBe('user-123')
    expect(mockSocket.data.email).toBe('test@example.com')
  })

  it('should disconnect client with invalid token', async () => {
    jest.spyOn(gateway['jwtService'], 'verifyAsync').mockRejectedValue(new Error('Invalid token'))

    await gateway.handleConnection(mockSocket as Socket)

    expect(mockSocket.disconnect).toHaveBeenCalled()
  })

  it('should allow subscribing to list with access', async () => {
    mockSocket.data = { userId: 'user-123' }

    jest.spyOn(gateway['prisma'].list, 'findFirst').mockResolvedValue({ id: 'list-123' } as any)

    const result = await gateway.subscribeToList('list-123', mockSocket as Socket)

    expect(mockSocket.join).toHaveBeenCalledWith('list:list-123')
    expect(result).toEqual({ event: 'subscribed', listId: 'list-123' })
  })

  it('should deny subscribing to list without access', async () => {
    mockSocket.data = { userId: 'user-123' }

    jest.spyOn(gateway['prisma'].list, 'findFirst').mockResolvedValue(null)

    const result = await gateway.subscribeToList('list-123', mockSocket as Socket)

    expect(mockSocket.join).not.toHaveBeenCalled()
    expect(result).toEqual({ error: 'Access denied to this list' })
  })

  it('should broadcast list updates to subscribers', () => {
    const mockServer = { to: jest.fn().mockReturnThis(), emit: jest.fn() }
    gateway.server = mockServer as any

    gateway.notifyListUpdate('list-123', { title: 'Updated' })

    expect(mockServer.to).toHaveBeenCalledWith('list:list-123')
    expect(mockServer.emit).toHaveBeenCalledWith('list:updated', expect.objectContaining({
      listId: 'list-123',
      data: { title: 'Updated' },
    }))
  })
})
```

#### E2E Tests: `backend/test/websocket.e2e-spec.ts`

```typescript
import { io, Socket } from 'socket.io-client'
import { Test } from '@nestjs/testing'
import { AppModule } from '../src/app.module'
import { INestApplication } from '@nestjs/common'

describe('WebSocket (e2e)', () => {
  let app: INestApplication
  let client1: Socket
  let client2: Socket
  let accessToken: string

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
    await app.listen(3001) // Different port for testing

    // Get access token for test user
    accessToken = await getTestAccessToken()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    client1 = io('http://localhost:3001/sharing', {
      auth: { token: accessToken },
    })

    client2 = io('http://localhost:3001/sharing', {
      auth: { token: accessToken },
    })
  })

  afterEach(() => {
    client1.disconnect()
    client2.disconnect()
  })

  it('should connect with valid token', (done) => {
    client1.on('connect', () => {
      expect(client1.connected).toBe(true)
      done()
    })
  })

  it('should subscribe to list', (done) => {
    client1.emit('subscribe:list', 'list-123', (response) => {
      expect(response).toEqual({ event: 'subscribed', listId: 'list-123' })
      done()
    })
  })

  it('should broadcast updates to all subscribers', (done) => {
    const listId = 'list-123'

    // Both clients subscribe
    client1.emit('subscribe:list', listId)
    client2.emit('subscribe:list', listId)

    // Client 1 listens for updates
    client1.on('list:updated', (data) => {
      expect(data.listId).toBe(listId)
      expect(data.data.title).toBe('Updated Title')
      done()
    })

    // Simulate list update from server
    setTimeout(() => {
      // Trigger update via gateway (simulated)
      app.get(SharingGateway).notifyListUpdate(listId, { title: 'Updated Title' })
    }, 100)
  })

  it('should have latency <100ms', (done) => {
    const listId = 'list-123'

    client1.emit('subscribe:list', listId)

    const start = Date.now()

    client1.on('list:updated', () => {
      const latency = Date.now() - start
      expect(latency).toBeLessThan(100)
      done()
    })

    app.get(SharingGateway).notifyListUpdate(listId, { test: true })
  })
})
```

### Acceptance Criteria

- [ ] WebSocket server starts with NestJS app
- [ ] Clients authenticate with JWT token
- [ ] Clients can subscribe/unsubscribe to lists
- [ ] Access control verified (only users with access can subscribe)
- [ ] List updates broadcast to all subscribers in room
- [ ] Item updates broadcast to all subscribers
- [ ] Share events broadcast (added/removed)
- [ ] Unit tests pass (100% coverage)
- [ ] E2E tests pass (connection, subscription, broadcasting)
- [ ] Latency <100ms for real-time updates
- [ ] Gateway integrates with ListService/ListItemService

---

## Phase 3: Hosting Migration to Render.com

**Effort:** 4 hours
**Priority:** MEDIUM (performance improvement)

### Problem

Railway hosting is slow for sync requests (3+ seconds).

### Solution

Migrate to Render.com for better performance and cost.

### Render Pricing

- **Web Service:** $7/month (1GB RAM, no sleep)
- **PostgreSQL:** $7/month (256MB RAM, 1GB storage)
- **Total:** $14/month

### Migration Steps

#### 1. Export Railway Configuration

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Export environment variables
railway env > railway.env
```

#### 2. Create Render Account

1. Go to https://render.com
2. Sign up with GitHub
3. Connect GitHub repository

#### 3. Create PostgreSQL Database

1. Dashboard → New → PostgreSQL
2. Name: `wiselist-db`
3. Plan: Starter ($7/month)
4. Region: Choose closest to your users
5. Click "Create Database"
6. Copy **Internal Database URL** (for backend)
7. Copy **External Database URL** (for migrations from Railway)

#### 4. Migrate Database Data

```bash
# On Railway PostgreSQL
pg_dump $RAILWAY_DATABASE_URL > wiselist_backup.sql

# On Render PostgreSQL
psql $RENDER_DATABASE_URL < wiselist_backup.sql

# Verify migration
psql $RENDER_DATABASE_URL -c "SELECT COUNT(*) FROM \"User\";"
```

#### 5. Create Web Service (Backend)

1. Dashboard → New → Web Service
2. Connect GitHub repository
3. Settings:
   - **Name:** `wiselist-backend`
   - **Branch:** `main`
   - **Root Directory:** `backend` (if monorepo)
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start:prod`
   - **Plan:** Starter ($7/month)
4. Environment Variables:
   ```
   NODE_ENV=production
   DATABASE_URL=<Internal Database URL from step 3>
   JWT_ACCESS_SECRET=<from railway.env>
   JWT_REFRESH_SECRET=<from railway.env>
   GOOGLE_CLIENT_ID=<from railway.env>
   GOOGLE_CLIENT_SECRET=<from railway.env>
   APPLE_CLIENT_ID=<from railway.env>
   FRONTEND_URL=https://wiselist.app (or your domain)
   ```
5. Click "Create Web Service"
6. Wait for deployment (5-10 minutes)
7. Copy **Service URL** (e.g., `https://wiselist-backend.onrender.com`)

#### 6. Update Frontend API URL

**File:** `frontend/.env.production`

```bash
VITE_API_URL=https://wiselist-backend.onrender.com
```

Rebuild frontend:
```bash
cd frontend
npm run build
```

#### 7. Test Deployment

```bash
# Test health endpoint
curl https://wiselist-backend.onrender.com/health

# Test sync endpoint (with auth)
curl -X POST https://wiselist-backend.onrender.com/lists/sync \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

#### 8. WebSocket Configuration

Ensure WebSocket works on Render:

**File:** `backend/src/sharing/sharing.gateway.ts`

```typescript
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || '*', // Allow Render URL
    credentials: true,
  },
  transports: ['websocket', 'polling'], // Fallback to polling if WebSocket fails
})
```

Test WebSocket connection:
```javascript
const socket = io('https://wiselist-backend.onrender.com/sharing', {
  auth: { token: accessToken }
})

socket.on('connect', () => console.log('Connected!'))
```

#### 9. Custom Domain (Optional)

1. Render Dashboard → wiselist-backend → Settings → Custom Domain
2. Add domain: `api.wiselist.app`
3. Add CNAME record in DNS:
   ```
   CNAME api wiselist-backend.onrender.com
   ```
4. Wait for SSL certificate (automatic)

### Monitoring

**Render Dashboard:**
- Logs: Real-time logs available
- Metrics: CPU, Memory, Request count
- Alerts: Set up email alerts for errors

**Application Performance:**
```bash
# Test sync performance
time curl -X POST https://wiselist-backend.onrender.com/lists/sync \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Should be <500ms
```

### Rollback Plan

If issues occur:
1. Revert frontend `VITE_API_URL` to Railway
2. Keep Railway running until Render is stable
3. Database backup on Railway is still available

### Acceptance Criteria

- [ ] PostgreSQL migrated to Render (all data intact)
- [ ] Backend deploys successfully on Render
- [ ] All environment variables set correctly
- [ ] Sync endpoint responds <500ms (vs 3s on Railway)
- [ ] WebSocket connects successfully
- [ ] Frontend connects to Render backend
- [ ] All API endpoints functional
- [ ] SSL certificate active (HTTPS)
- [ ] Monitoring set up (logs, metrics, alerts)

---

## Phase 4: Testing & Documentation

**Effort:** 2 hours
**Priority:** HIGH

### Testing Checklist

**Performance Tests:**
- [ ] Sync 100 lists with 1000 items in <500ms
- [ ] WebSocket latency <100ms
- [ ] Concurrent connections: 50 users subscribe to same list
- [ ] Database query count: verify no N+1 queries

**Functional Tests:**
- [ ] User creates list → WebSocket broadcasts to subscribers
- [ ] User updates item → WebSocket broadcasts to subscribers
- [ ] User shares list → WebSocket broadcasts to new user
- [ ] User removes share → WebSocket broadcasts to removed user
- [ ] Pagination works (fetch 100, then next 100)
- [ ] Incremental sync works (only updated lists)

**Security Tests:**
- [ ] Unauthorized user cannot subscribe to list
- [ ] Invalid JWT token disconnects WebSocket
- [ ] User cannot access lists they don't own/share

### Documentation

**File:** `backend/README.md`

```markdown
# Wiselist Backend

## WebSocket Events

### Client → Server

**subscribe:list**
- Payload: `listId: string`
- Response: `{ event: 'subscribed', listId: string }`
- Joins room for list updates

**unsubscribe:list**
- Payload: `listId: string`
- Response: `{ event: 'unsubscribed', listId: string }`
- Leaves room for list updates

### Server → Client

**list:updated**
- Payload: `{ listId, data, timestamp }`
- Emitted when list is created/updated/deleted

**item:updated**
- Payload: `{ listId, itemId, data, timestamp }`
- Emitted when item is created/updated/deleted

**share:added**
- Payload: `{ listId, share, timestamp }`
- Emitted when list is shared with new user

**share:removed**
- Payload: `{ listId, userId, timestamp }`
- Emitted when user is removed from share

## Deployment

### Render.com

Production: https://wiselist-backend.onrender.com

Environment variables:
- DATABASE_URL
- JWT_ACCESS_SECRET
- JWT_REFRESH_SECRET
- FRONTEND_URL

### Local Development

```bash
npm run start:dev
```

WebSocket: ws://localhost:3000/sharing
```

---

## Summary

**Total Backend Effort:** ~22 hours

| Phase | Effort | Priority |
|-------|--------|----------|
| Fix N+1 Queries | 4h | HIGH |
| WebSocket Gateway | 12h | CRITICAL |
| Hosting Migration | 4h | MEDIUM |
| Testing & Docs | 2h | HIGH |

**Key Deliverables:**
1. ✅ Optimized sync endpoint (N+1 fixed, pagination, incremental sync)
2. ✅ WebSocket Gateway for real-time updates
3. ✅ Render.com deployment (<500ms sync, <100ms WebSocket latency)
4. ✅ Comprehensive tests (unit + E2E)
5. ✅ Documentation for WebSocket events

**Next:** Frontend implementation (WebSocket client, ShareManagementDialog UI)
