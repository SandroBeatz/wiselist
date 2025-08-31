import axios from 'axios'
import { tokenService } from '@shared/services/token.service'
import { requestQueueService } from '@shared/services/request-queue.service'
import type { AxiosRequestConfig } from 'axios'

const API = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL}/api/`
})

/**
 * Request interceptor to add authorization header
 */
API.interceptors.request.use(
    (config) => {
        const token = tokenService.accessToken;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

/**
 * Response interceptor with automatic token refresh
 */
API.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Handle 401 errors with token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            // If refresh is already in progress, queue this request
            if (requestQueueService.isRefreshInProgress) {
                return requestQueueService.enqueue(originalRequest);
            }

            // If no refresh token available, clear tokens and reject
            if (!tokenService.hasValidRefreshToken()) {
                tokenService.clearTokens();
                return Promise.reject(error);
            }

            // Start refresh process
            requestQueueService.setRefreshStatus(true);

            try {
                // Import here to avoid circular dependency
                const { apiAuth } = await import('../../features/Auth/api');
                
                // Attempt to refresh token
                const response = await apiAuth.refreshToken(tokenService.refreshToken!);
                
                // Update tokens
                tokenService.setTokens(response.accessToken, response.refreshToken);
                
                // Process queued requests
                await requestQueueService.processQueue(API);
                
                // Retry original request with new token
                originalRequest.headers!.Authorization = `Bearer ${response.accessToken}`;
                return API(originalRequest);
                
            } catch (refreshError) {
                // Refresh failed - clear tokens and reject all queued requests
                tokenService.clearTokens();
                requestQueueService.rejectQueue(refreshError);
                
                return Promise.reject(refreshError);
            } finally {
                requestQueueService.setRefreshStatus(false);
            }
        }

        return Promise.reject(error);
    }
);

// Legacy compatibility functions
export const setAuthorizationToken = (token: string): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
        if (!token) {
            reject(new Error('Token is required'))
        }
        tokenService.setAccessToken(token);
        resolve()
    })
}

export const clearAuthorizationToken = () => {
    tokenService.clearTokens();
}

export { API }
