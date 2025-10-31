import { defineStore } from 'pinia'
import { apiUser, type UpdateProfilePayload, type ChangePasswordPayload } from '../api'
import { tokenService } from '@shared/services/token.service'
import { listRxService } from '@shared/services/rxjs/list.service'
import { listItemRxService } from '@shared/services/rxjs/list-item.service'
import { syncService } from '@shared/services/sync/sync.service'
import { db } from '@shared/db'
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
     * Set authentication tokens, update user info, and sync data from server
     * @param accessToken Access token
     * @param refreshToken Refresh token
     */
    async setTokens(accessToken: string, refreshToken: string) {
      tokenService.setTokens(accessToken, refreshToken)
      await this.fetchUser()

      // Trigger full sync after successful login to get user's data from server
      try {
        await syncService.forceSync()
      } catch (error) {
        console.error('[UserStore] Error syncing data on login:', error)
        // Don't fail login if sync fails - user can sync manually later
      }
    },

    /**
     * Handle user logout - clear tokens, user info, and local database
     * This ensures data isolation between different users
     */
    async logout() {
      this.info = null
      tokenService.clearTokens()

      // Clear all local data from IndexedDB to prevent data leakage between users
      try {
        await listRxService.clearAll()
        await listItemRxService.clearAll()
        await db.syncOperations.clear()
      } catch (error) {
        console.error('[UserStore] Error clearing local database on logout:', error)
        // Continue with logout even if clearing fails
      }
    },

    /**
     * Update user profile
     * @param payload Profile update data
     */
    async updateProfile(payload: UpdateProfilePayload): Promise<void> {
      try {
        this.toggleLoader(true)
        const updatedUser = await apiUser.updateProfile(payload)
        this.info = updatedUser
      } finally {
        this.toggleLoader(false)
      }
    },

    /**
     * Change user password
     * @param payload Password change data
     */
    async changePassword(payload: ChangePasswordPayload): Promise<void> {
      await apiUser.changePassword(payload)
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
