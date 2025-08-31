/**
 * JWT token payload interface
 */
export interface JwtPayload {
    exp?: number;
    iat?: number;
    id?: string;
    [key: string]: any;
}

/**
 * Token validation result
 */
export interface TokenValidationResult {
    isValid: boolean;
    isExpired: boolean;
    expiryDate: Date | null;
    payload: JwtPayload | null;
}

/**
 * Authentication state interface
 */
export interface AuthState {
    isAuthenticated: boolean;
    hasValidAccessToken: boolean;
    hasValidRefreshToken: boolean;
    needsTokenRefresh: boolean;
    accessToken: string | null;
    refreshToken: string | null;
}

/**
 * Token refresh response
 */
export interface TokenRefreshResponse {
    success: boolean;
    error?: string;
    tokens?: {
        accessToken: string;
        refreshToken: string;
    };
}