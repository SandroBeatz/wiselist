import axios from 'axios'

const API = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api/`
})
const token = ''

const AuthorizationToken = token ? { Authorization: `Bearer ${token}` } : undefined

API.defaults.headers.common = {
    ...API.defaults.headers.common,
    Authorization: `Bearer ${token}`,
}

export const setAuthorizationToken = (token: string): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    if (!token) {
      reject(new Error('Token is required'))
    }
    // tokenCache.set(token)
    API.defaults.headers.common = {
      ...API.defaults.headers.common,
      Authorization: `Bearer ${token}`,
    }
    resolve()
  })
}

export const clearAuthorizationToken = () => {
  // tokenCache.remove()
  API.defaults.headers.common = {
    'Content-Type': 'application/json',
  }
}

export { API }

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

      console.log(originalRequest)

    return Promise.reject(error)
  },
)
