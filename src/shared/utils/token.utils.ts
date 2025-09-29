/**
 * Token utility functions for JWT token management
 */

interface JwtPayload {
  exp?: number
  iat?: number
  id?: string
}

/**
 * Decode JWT payload without verification
 * @param token JWT token string
 * @returns Decoded payload or null if invalid
 */
export const decodeJwt = (token: string): JwtPayload | null => {
  if (!token) return null

  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const payload = parts[1]
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

/**
 * Check if token is expired
 * @param token JWT token string
 * @param bufferSeconds Additional buffer time in seconds (default: 30s)
 * @returns true if token is expired or invalid
 */
export const isTokenExpired = (token: string, bufferSeconds: number = 30): boolean => {
  const payload = decodeJwt(token)
  if (!payload?.exp) return true

  const currentTime = Math.floor(Date.now() / 1000)
  const expiryTime = payload.exp - bufferSeconds

  return currentTime >= expiryTime
}

/**
 * Check if token is valid (exists and not expired)
 * @param token JWT token string
 * @returns true if token is valid
 */
export const isTokenValid = (token: string): boolean => {
  return !!token && !isTokenExpired(token)
}

/**
 * Get token expiry date
 * @param token JWT token string
 * @returns Date object or null if invalid
 */
export const getTokenExpiry = (token: string): Date | null => {
  const payload = decodeJwt(token)
  if (!payload?.exp) return null

  return new Date(payload.exp * 1000)
}
