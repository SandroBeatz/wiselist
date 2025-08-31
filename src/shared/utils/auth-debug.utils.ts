import { tokenService } from '@shared/services/token.service'
import { requestQueueService } from '@shared/services/request-queue.service'
import { decodeJwt, isTokenExpired } from '@shared/utils/token.utils'

/**
 * Debug utilities for authentication system
 * Only available in development mode
 */
export const authDebugUtils = {
  /**
   * Log current auth state
   */
  logAuthState(): void {
    if (import.meta.env.MODE !== 'development') return

    const accessToken = tokenService.accessToken
    const refreshToken = tokenService.refreshToken

    console.group('🔐 Auth State Debug')
    console.log('Access Token:', accessToken ? `***${accessToken.slice(-10)}` : 'null')
    console.log('Refresh Token:', refreshToken ? `***${refreshToken.slice(-10)}` : 'null')
    console.log('Is Authenticated:', tokenService.isAuthenticated())
    console.log('Has Valid Access Token:', tokenService.hasValidAccessToken())
    console.log('Has Valid Refresh Token:', tokenService.hasValidRefreshToken())
    console.log('Access Token Expired:', accessToken ? isTokenExpired(accessToken) : 'N/A')
    console.log('Refresh Token Expired:', refreshToken ? isTokenExpired(refreshToken) : 'N/A')

    if (accessToken) {
      const payload = decodeJwt(accessToken)
      console.log('Access Token Payload:', payload)
      if (payload?.exp) {
        console.log('Access Token Expires At:', new Date(payload.exp * 1000))
      }
    }

    console.log('Request Queue Size:', requestQueueService.queueSize)
    console.log('Refresh In Progress:', requestQueueService.isRefreshInProgress)
    console.groupEnd()
  },

  /**
   * Clear all tokens for testing
   */
  clearTokens(): void {
    if (import.meta.env.MODE !== 'development') return

    tokenService.clearTokens()
    console.log('🗑️ All tokens cleared')
  },

  /**
   * Simulate token expiry for testing
   */
  simulateTokenExpiry(): void {
    if (import.meta.env.MODE !== 'development') return

    const expiredToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InRlc3QiLCJleHAiOjE2MDk0NTkyMDB9.test'
    tokenService.setAccessToken(expiredToken)
    console.log('⏰ Simulated expired access token')
  },

  /**
   * Test token refresh manually
   */
  async testTokenRefresh(): Promise<void> {
    if (import.meta.env.MODE !== 'development') return

    try {
      const { useUserStore } = await import('../../entities/user/model/user.store')
      const userStore = useUserStore()
      const success = await userStore.refreshTokens()

      console.log('🔄 Manual token refresh result:', success)
    } catch (error) {
      console.error('❌ Manual token refresh failed:', error)
    }
  },
}

// Make available globally in development
if (import.meta.env.MODE === 'development') {
  ;(window as typeof window & { authDebug: typeof authDebugUtils }).authDebug = authDebugUtils
}
