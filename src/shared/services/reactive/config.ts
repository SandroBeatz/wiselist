// Global RxJS configuration
export const REACTIVE_CONFIG = {
  // Default timeout for HTTP requests
  DEFAULT_TIMEOUT: 30000,
  
  // Default retry attempts
  DEFAULT_RETRY_ATTEMPTS: 3,
  
  // Default debounce time for user input
  DEFAULT_DEBOUNCE_TIME: 300,
  
  // Default throttle time for frequent actions
  DEFAULT_THROTTLE_TIME: 1000,
  
  // Buffer size for replay subjects
  DEFAULT_BUFFER_SIZE: 1,
  
  // WebSocket reconnection intervals
  WEBSOCKET_RECONNECT_INTERVAL: 5000,
  WEBSOCKET_MAX_RECONNECT_ATTEMPTS: 5,
  
  // Cache TTL in milliseconds
  CACHE_TTL: {
    SHORT: 60000, // 1 minute
    MEDIUM: 300000, // 5 minutes
    LONG: 900000, // 15 minutes
  },
  
  // Logging configuration
  LOGGING: {
    ENABLED: process.env.NODE_ENV === 'development',
    LEVEL: 'info' as 'debug' | 'info' | 'warn' | 'error'
  }
} as const

export type ReactiveConfig = typeof REACTIVE_CONFIG