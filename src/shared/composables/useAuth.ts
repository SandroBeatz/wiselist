import { computed } from 'vue'
import { tokenService } from '@shared/services/token.service'
import { useUserStore } from '../../entities/user/model/user.store'

/**
 * Authentication composable providing reactive auth state and methods
 */
export function useAuth() {
    const userStore = useUserStore()

    // Reactive computed properties
    const isAuthenticated = computed(() => tokenService.isAuthenticated())
    const hasValidAccessToken = computed(() => tokenService.hasValidAccessToken())
    const needsTokenRefresh = computed(() => 
        tokenService.isAccessTokenExpired() && tokenService.hasValidRefreshToken()
    )

    // Token getters
    const accessToken = computed(() => tokenService.accessToken)
    const refreshToken = computed(() => tokenService.refreshToken)

    // User info from store
    const user = computed(() => userStore.info)
    const isLoading = computed(() => userStore.isLoading)

    /**
     * Set both access and refresh tokens
     * @param accessToken Access token
     * @param refreshToken Refresh token
     */
    const setTokens = async (accessToken: string, refreshToken: string) => {
        await userStore.setTokens(accessToken, refreshToken)
    }

    /**
     * Force token refresh if possible
     * @returns Promise resolving to success status
     */
    const refreshTokens = async (): Promise<boolean> => {
        return await userStore.refreshTokens()
    }

    /**
     * Logout user and clear all tokens
     */
    const logout = async () => {
        await userStore.logout()
    }

    /**
     * Initialize user session (check tokens and fetch user data if authenticated)
     */
    const initSession = async () => {
        await userStore.initUser()
    }

    return {
        // Reactive state
        isAuthenticated,
        hasValidAccessToken,
        needsTokenRefresh,
        user,
        isLoading,
        
        // Token values
        accessToken,
        refreshToken,
        
        // Actions
        setTokens,
        refreshTokens,
        logout,
        initSession,
    }
}