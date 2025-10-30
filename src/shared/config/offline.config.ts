/**
 * Offline-First Configuration
 *
 * Configure whether the app should work in offline-only mode (without backend)
 * or with backend synchronization.
 */

/**
 * Offline-only mode configuration
 *
 * Set to `true` to disable backend synchronization and work purely offline.
 * Set to `false` to enable automatic synchronization with backend API.
 *
 * Default: true (offline-only, no backend required)
 */
export const OFFLINE_ONLY_MODE = true

/**
 * Auto-sync interval (milliseconds)
 * Only used when OFFLINE_ONLY_MODE = false
 *
 * Default: 30000 (30 seconds)
 */
export const AUTO_SYNC_INTERVAL = 30000

/**
 * Max sync retry attempts
 * Only used when OFFLINE_ONLY_MODE = false
 *
 * Default: 3
 */
export const MAX_SYNC_RETRIES = 3

/**
 * Sync retry backoff delay (milliseconds)
 * Only used when OFFLINE_ONLY_MODE = false
 *
 * Default: 2000 (2 seconds)
 */
export const SYNC_RETRY_BACKOFF = 2000
