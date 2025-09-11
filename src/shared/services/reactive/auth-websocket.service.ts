import { watchEffect } from 'vue'
import { BehaviorSubject } from 'rxjs'
import { distinctUntilChanged, filter, tap } from 'rxjs/operators'
import { tokenService } from '../token.service'
import { webSocketService } from './websocket-instance'
import { BaseReactiveService } from './base-reactive.service'

/**
 * Service that manages WebSocket connection based on authentication state
 * Automatically connects/disconnects WebSocket when user logs in/out
 */
export class AuthWebSocketService extends BaseReactiveService {
  private readonly _isAuthenticated$ = new BehaviorSubject<boolean>(false)

  constructor() {
    super({ enableLogging: import.meta.env.DEV })
    this.initializeAuthWatcher()
    this.initializeWebSocketAuth()
  }

  get isAuthenticated$() {
    return this._isAuthenticated$.asObservable().pipe(distinctUntilChanged())
  }

  get currentAuthState(): boolean {
    return this._isAuthenticated$.value
  }

  /**
   * Initialize Vue reactive watcher for token changes
   */
  private initializeAuthWatcher(): void {
    // Watch for token changes using Vue's reactivity system
    watchEffect(() => {
      const isAuth = tokenService.isAuthenticated()
      
      if (this._isAuthenticated$.value !== isAuth) {
        this.log('Authentication state changed', { isAuthenticated: isAuth })
        this._isAuthenticated$.next(isAuth)
      }
    })
  }

  /**
   * Initialize WebSocket connection management based on auth state
   */
  private initializeWebSocketAuth(): void {
    // Subscribe to authentication state changes
    this.isAuthenticated$
      .pipe(
        tap(isAuthenticated => {
          this.log('Handling auth state change', { isAuthenticated })
          
          if (isAuthenticated) {
            this.handleLogin()
          } else {
            this.handleLogout()
          }
        })
      )
      .subscribe()

    // Also listen to WebSocket connection state for additional auth handling
    webSocketService.connectionState$
      .pipe(
        filter(state => state === 'error'),
        tap(() => {
          // If WebSocket connection fails, check if it's due to invalid token
          if (tokenService.isAccessTokenExpired() && !tokenService.hasValidRefreshToken()) {
            this.log('WebSocket connection failed due to invalid tokens')
            this.handleTokenExpiration()
          }
        })
      )
      .subscribe()
  }

  /**
   * Handle user login - connect to WebSocket
   */
  private handleLogin(): void {
    this.log('User logged in, connecting to WebSocket')
    this.clearError()
    
    if (!webSocketService.isConnected) {
      webSocketService.connect()
    }
  }

  /**
   * Handle user logout - disconnect from WebSocket
   */
  private handleLogout(): void {
    this.log('User logged out, disconnecting from WebSocket')
    webSocketService.disconnect()
  }

  /**
   * Handle token expiration
   */
  private handleTokenExpiration(): void {
    this.log('Tokens expired, disconnecting WebSocket')
    webSocketService.disconnect()
    this.setError('Authentication expired. Please log in again.')
  }

  /**
   * Manually trigger WebSocket reconnection (e.g., after token refresh)
   */
  reconnectWebSocket(): void {
    if (tokenService.isAuthenticated()) {
      this.log('Manually reconnecting WebSocket after token refresh')
      webSocketService.disconnect()
      
      // Small delay to ensure clean disconnection
      setTimeout(() => {
        webSocketService.connect()
      }, 100)
    }
  }

  /**
   * Get WebSocket service instance for direct access
   */
  getWebSocketService() {
    return webSocketService
  }

  destroy(): void {
    this._isAuthenticated$.complete()
    super.destroy()
  }
}

// Singleton instance
export const authWebSocketService = new AuthWebSocketService()