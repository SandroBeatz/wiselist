import { defineStore } from 'pinia'
import { apiUser } from '../api'
import { tokenService } from '@shared/services/token.service'
import type { User } from './types'
import type { Nullable } from '@shared/types/global'

interface UserState {
  isLoading: boolean
  info: Nullable<User>
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    isLoading: false,
    info: null,
  }),

  getters: {
    // Reactive authentication state based on tokens
    isAuth: () => tokenService.isAuthenticated(),

    // Check if user has valid access token
    hasValidToken: () => tokenService.hasValidAccessToken(),

    // Check if access token is expired but refresh token is available
    needsTokenRefresh: () =>
      tokenService.isAccessTokenExpired() && tokenService.hasValidRefreshToken(),
  },

  actions: {
    toggleLoader(value?: boolean) {
      this.isLoading = typeof value === 'boolean' ? value : !this.isLoading
    },

    async fetchUser() {
      try {
        this.toggleLoader(true)
        this.info = await apiUser.getMe()
        return 'ok'
      } finally {
        this.toggleLoader(false)
      }
    },

    async initUser() {
      // Check if user has valid tokens
      if (tokenService.isAuthenticated()) {
        try {
          await this.fetchUser()
        } catch (error) {
          // If fetching user fails and we don't have valid tokens, clear everything
          if (!tokenService.hasValidAccessToken()) {
            this.logout()
          }
          throw error
        }
      }
    },

    /**
     * Set authentication tokens and update user info
     * @param accessToken Access token
     * @param refreshToken Refresh token
     */
    async setTokens(accessToken: string, refreshToken: string) {
      tokenService.setTokens(accessToken, refreshToken)
      await this.fetchUser()
    },

    /**
     * Handle user logout - clear tokens and user info
     */
    async logout() {
      this.info = null
      tokenService.clearTokens()
    },

    /**
     * Force token refresh if possible
     * @returns Promise resolving to success status
     */
    async refreshTokens(): Promise<boolean> {
      if (!tokenService.hasValidRefreshToken()) {
        return false
      }

      try {
        const { apiAuth } = await import('../../../features/Auth/api')
        const response = await apiAuth.refreshToken(tokenService.refreshToken!)
        tokenService.setTokens(response.accessToken, response.refreshToken)
        return true
      } catch (_error) {
        // Refresh failed - logout user
        await this.logout()
        return false
      }
    },
  },
})
