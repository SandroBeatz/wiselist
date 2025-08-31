import { tokenService } from './token.service'
import { useUserStore } from '../../entities/user/model/user.store'

/**
 * Token monitor service for proactive token refresh
 */
class TokenMonitorService {
    private refreshTimer: number | null = null
    private readonly REFRESH_BUFFER_MS = 5 * 60 * 1000 // 5 minutes before expiry

    /**
     * Start monitoring tokens for expiry
     */
    startMonitoring(): void {
        this.stopMonitoring() // Clear any existing timer

        if (!tokenService.isAuthenticated()) {
            return
        }

        const checkInterval = 60 * 1000 // Check every minute
        this.refreshTimer = window.setInterval(async () => {
            await this.checkAndRefreshToken()
        }, checkInterval)
    }

    /**
     * Stop monitoring tokens
     */
    stopMonitoring(): void {
        if (this.refreshTimer) {
            window.clearInterval(this.refreshTimer)
            this.refreshTimer = null
        }
    }

    /**
     * Check if token needs refresh and attempt to refresh it
     */
    private async checkAndRefreshToken(): Promise<void> {
        try {
            // If not authenticated, stop monitoring
            if (!tokenService.isAuthenticated()) {
                this.stopMonitoring()
                return
            }

            // If access token is expired but we have refresh token, attempt refresh
            if (tokenService.isAccessTokenExpired() && tokenService.hasValidRefreshToken()) {
                const userStore = useUserStore()
                const success = await userStore.refreshTokens()
                
                if (!success) {
                    this.stopMonitoring()
                }
            }
        } catch (error) {
            console.error('Token monitoring error:', error)
            // Continue monitoring even if refresh fails
        }
    }

    /**
     * Force immediate token check and refresh if needed
     */
    async forceRefreshCheck(): Promise<boolean> {
        try {
            await this.checkAndRefreshToken()
            return true
        } catch {
            return false
        }
    }
}

// Create singleton instance
export const tokenMonitorService = new TokenMonitorService()