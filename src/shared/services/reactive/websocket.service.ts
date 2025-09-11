import { io, Socket } from 'socket.io-client'
import { BehaviorSubject, Subject, Observable, timer } from 'rxjs'
import { takeUntil, take } from 'rxjs/operators'
import { BaseReactiveService } from './base-reactive.service'
import { REACTIVE_CONFIG } from './config'
import { tokenService } from '../token.service'

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'

export interface WebSocketConfig {
  url: string
  namespace?: string
  enableLogging?: boolean
  autoConnect?: boolean
  maxReconnectAttempts?: number
  reconnectInterval?: number
}

export interface ListEventPayload {
  type: 'LIST_CREATED' | 'LIST_UPDATED' | 'LIST_DELETED' | 'ITEM_CREATED' | 'ITEM_UPDATED' | 'ITEM_DELETED' | 'ITEM_CHECKED' | 'ITEM_REORDERED'
  data: any
  listId: string
  userId: string
  version: number
}

export interface UserPresencePayload {
  listId: string
  userId: string
  userProfile: {
    id: string
    fullName: string
    avatar?: string
  }
}

/**
 * WebSocket service for real-time communication
 * Handles Socket.io connection, authentication, and event management
 */
export class WebSocketService extends BaseReactiveService {
  private socket: Socket | null = null
  private wsConfig: Required<WebSocketConfig>
  
  // State observables
  private readonly _connectionState$ = new BehaviorSubject<ConnectionState>('disconnected')
  private readonly _listEvents$ = new Subject<ListEventPayload>()
  private readonly _userPresence$ = new Subject<UserPresencePayload>()
  private readonly _activeUsers$ = new BehaviorSubject<UserPresencePayload[]>([])
  
  // Reconnection state
  private reconnectAttempts = 0
  private isManualDisconnect = false

  constructor(config: WebSocketConfig) {
    super({ enableLogging: config.enableLogging || false })
    
    this.wsConfig = {
      url: config.url,
      namespace: config.namespace || '/lists',
      enableLogging: config.enableLogging || false,
      autoConnect: config.autoConnect !== false,
      maxReconnectAttempts: config.maxReconnectAttempts || REACTIVE_CONFIG.WEBSOCKET_MAX_RECONNECT_ATTEMPTS,
      reconnectInterval: config.reconnectInterval || REACTIVE_CONFIG.WEBSOCKET_RECONNECT_INTERVAL
    }

    if (this.wsConfig.autoConnect) {
      this.connect()
    }
  }

  // Observable getters
  get connectionState$(): Observable<ConnectionState> {
    return this._connectionState$.asObservable()
  }

  get listEvents$(): Observable<ListEventPayload> {
    return this._listEvents$.asObservable()
  }

  get userPresence$(): Observable<UserPresencePayload> {
    return this._userPresence$.asObservable()
  }

  get activeUsers$(): Observable<UserPresencePayload[]> {
    return this._activeUsers$.asObservable()
  }

  get isConnected(): boolean {
    return this._connectionState$.value === 'connected'
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.socket?.connected) {
      this.log('Already connected')
      return
    }

    if (!tokenService.isAuthenticated()) {
      this.setError('Cannot connect: User not authenticated')
      return
    }

    this.log('Connecting to WebSocket server', { url: this.wsConfig.url, namespace: this.wsConfig.namespace })
    this._connectionState$.next('connecting')
    this.isManualDisconnect = false

    const socketUrl = `${this.wsConfig.url}${this.wsConfig.namespace}`
    
    this.socket = io(socketUrl, {
      auth: {
        token: tokenService.accessToken
      },
      transports: ['websocket', 'polling'],
      timeout: REACTIVE_CONFIG.DEFAULT_TIMEOUT,
      forceNew: true
    })

    this.setupSocketEventHandlers()
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.log('Disconnecting from WebSocket server')
    this.isManualDisconnect = true
    this.reconnectAttempts = 0
    
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    
    this._connectionState$.next('disconnected')
    this.clearError()
  }

  /**
   * Join a list room for real-time updates
   */
  joinList(listId: string): void {
    if (!this.isConnected || !this.socket) {
      this.log('Cannot join list: Not connected', { listId })
      return
    }

    this.log('Joining list room', { listId })
    this.socket.emit('joinList', { listId })
  }

  /**
   * Leave a list room
   */
  leaveList(listId: string): void {
    if (!this.isConnected || !this.socket) {
      this.log('Cannot leave list: Not connected', { listId })
      return
    }

    this.log('Leaving list room', { listId })
    this.socket.emit('leaveList', { listId })
  }

  /**
   * Send heartbeat to maintain connection
   */
  sendHeartbeat(listId?: string): void {
    if (!this.isConnected || !this.socket) {
      this.log('Cannot send heartbeat: Not connected')
      return
    }

    this.socket.emit('heartbeat', listId ? { listId } : {})
  }

  /**
   * Get active users in a list
   */
  getActiveUsers(listId: string): void {
    if (!this.isConnected || !this.socket) {
      this.log('Cannot get active users: Not connected', { listId })
      return
    }

    this.log('Requesting active users', { listId })
    this.socket.emit('getActiveUsers', { listId })
  }

  /**
   * Setup Socket.io event handlers
   */
  private setupSocketEventHandlers(): void {
    if (!this.socket) return

    // Connection events
    this.socket.on('connect', () => {
      this.log('Connected to WebSocket server')
      this._connectionState$.next('connected')
      this.reconnectAttempts = 0
      this.clearError()
    })

    this.socket.on('disconnect', (reason) => {
      this.log('Disconnected from WebSocket server', { reason })
      this._connectionState$.next('disconnected')
      
      if (!this.isManualDisconnect && reason !== 'io client disconnect') {
        this.handleReconnection()
      }
    })

    this.socket.on('connect_error', (error) => {
      this.log('Connection error', error)
      this.setError(`Connection error: ${error.message}`)
      this._connectionState$.next('error')
      
      if (!this.isManualDisconnect) {
        this.handleReconnection()
      }
    })

    // Authentication events
    this.socket.on('authenticated', () => {
      this.log('Successfully authenticated')
      this.clearError()
    })

    this.socket.on('unauthorized', (error) => {
      this.log('Authentication failed', error)
      this.setError(`Authentication failed: ${error.message || 'Invalid token'}`)
      this._connectionState$.next('error')
    })

    // List events
    this.socket.on('listEvent', (payload: ListEventPayload) => {
      this.log('Received list event', payload)
      this._listEvents$.next(payload)
    })

    // User presence events
    this.socket.on('userJoined', (payload: UserPresencePayload) => {
      this.log('User joined', payload)
      this._userPresence$.next(payload)
      this.updateActiveUsers(payload, 'join')
    })

    this.socket.on('userLeft', (payload: UserPresencePayload) => {
      this.log('User left', payload)
      this._userPresence$.next(payload)
      this.updateActiveUsers(payload, 'leave')
    })

    this.socket.on('activeUsers', (users: UserPresencePayload[]) => {
      this.log('Received active users', { count: users.length })
      this._activeUsers$.next(users)
    })

    // Error events
    this.socket.on('error', (error) => {
      this.log('Socket error', error)
      this.setError(`Socket error: ${error.message || 'Unknown error'}`)
    })
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnection(): void {
    if (this.isManualDisconnect || this.reconnectAttempts >= this.wsConfig.maxReconnectAttempts) {
      this.log('Max reconnection attempts reached')
      this._connectionState$.next('error')
      this.setError('Connection failed: Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    this.log('Attempting to reconnect', { attempt: this.reconnectAttempts })
    this._connectionState$.next('reconnecting')

    // Use RxJS timer for reconnection with exponential backoff
    const backoffDelay = Math.min(
      this.wsConfig.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    )

    timer(backoffDelay)
      .pipe(
        takeUntil(this.destroy$),
        take(1)
      )
      .subscribe(() => {
        if (!this.isManualDisconnect && !this.isConnected) {
          this.connect()
        }
      })
  }

  /**
   * Update active users list
   */
  private updateActiveUsers(payload: UserPresencePayload, action: 'join' | 'leave'): void {
    const currentUsers = this._activeUsers$.value
    
    if (action === 'join') {
      const exists = currentUsers.find(user => 
        user.userId === payload.userId && user.listId === payload.listId
      )
      if (!exists) {
        this._activeUsers$.next([...currentUsers, payload])
      }
    } else {
      const filtered = currentUsers.filter(user =>
        !(user.userId === payload.userId && user.listId === payload.listId)
      )
      this._activeUsers$.next(filtered)
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.disconnect()
    this._connectionState$.complete()
    this._listEvents$.complete()
    this._userPresence$.complete()
    this._activeUsers$.complete()
    super.destroy()
  }
}