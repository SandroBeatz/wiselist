import { WebSocketService } from './websocket.service'

/**
 * WebSocket service instance configuration
 */
const getWebSocketUrl = (): string => {
  // In development, use localhost
  if (import.meta.env.DEV) {
    return 'http://localhost:3000'
  }
  
  // In production, use the same origin as the web app
  return window.location.origin
}

/**
 * Singleton WebSocket service instance
 */
export const webSocketService = new WebSocketService({
  url: getWebSocketUrl(),
  namespace: '/lists',
  enableLogging: import.meta.env.DEV,
  autoConnect: false, // Manual connection control
  maxReconnectAttempts: 5,
  reconnectInterval: 5000
})

// Export type for dependency injection or testing
export type WebSocketServiceInstance = typeof webSocketService