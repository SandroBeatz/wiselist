import { useLocalStorage } from '@vueuse/core'
import { storageKeys } from '@shared/constants/storage.constants'
import { isTokenValid, isTokenExpired } from '@shared/utils/token.utils'
import type { Ref } from 'vue'

/**
 * Token management service for handling access and refresh tokens
 */
class TokenService {
  private _accessToken: Ref<string | null>
  private _refreshToken: Ref<string | null>

  constructor() {
    this._accessToken = useLocalStorage<string | null>(storageKeys.ACCESS_TOKEN, null)
    this._refreshToken = useLocalStorage<string | null>(storageKeys.REFRESH_TOKEN, null)
  }

  /**
   * Get current access token
   */
  get accessToken(): string | null {
    return this._accessToken.value
  }

  /**
   * Get current refresh token
   */
  get refreshToken(): string | null {
    return this._refreshToken.value
  }

  /**
   * Set both access and refresh tokens
   * @param accessToken Access token string
   * @param refreshToken Refresh token string
   */
  setTokens(accessToken: string, refreshToken: string): void {
    this._accessToken.value = accessToken
    this._refreshToken.value = refreshToken
  }

  /**
   * Set only access token (used after refresh)
   * @param accessToken Access token string
   */
  setAccessToken(accessToken: string): void {
    this._accessToken.value = accessToken
  }

  /**
   * Clear all tokens
   */
  clearTokens(): void {
    this._accessToken.value = null
    this._refreshToken.value = null
  }

  /**
   * Check if user has valid access token
   * @returns true if access token exists and is not expired
   */
  hasValidAccessToken(): boolean {
    return this.accessToken ? isTokenValid(this.accessToken) : false
  }

  /**
   * Check if access token is expired
   * @returns true if access token is expired or missing
   */
  isAccessTokenExpired(): boolean {
    return this.accessToken ? isTokenExpired(this.accessToken) : true
  }

  /**
   * Check if user has valid refresh token
   * @returns true if refresh token exists and is not expired
   */
  hasValidRefreshToken(): boolean {
    return this.refreshToken ? isTokenValid(this.refreshToken) : false
  }

  /**
   * Check if user is authenticated (has valid access token or valid refresh token)
   * @returns true if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.hasValidAccessToken() || this.hasValidRefreshToken()
  }

  /**
   * Get reactive access token ref
   */
  get accessTokenRef(): Ref<string | null> {
    return this._accessToken
  }

  /**
   * Get reactive refresh token ref
   */
  get refreshTokenRef(): Ref<string | null> {
    return this._refreshToken
  }
}

// Create singleton instance
export const tokenService = new TokenService()
