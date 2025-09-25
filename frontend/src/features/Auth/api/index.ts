import { API } from '@shared/instances/axios'
import type { AuthResponse, LoginForm, RegisterForm } from '../model/types'
import type { GoogleLoginResponse } from '@capgo/capacitor-social-login'

const LOGIN_ROUTE = 'auth/login'
const REGISTER_ROUTE = 'auth/register'
const LOGOUT_ROUTE = 'auth/logout'
const GOOGLE_AUTH_ROUTE = 'auth/google'
const REFRESH_ROUTE = 'auth/refresh'

const login = (form: LoginForm) =>
  new Promise<AuthResponse>((resolve, reject) => {
    API.post(LOGIN_ROUTE, { ...form })
      .then((response) => resolve(response.data))
      .catch((e) =>
        reject(
          Object.assign(new Error(e.message || 'Login request failed'), {
            response: e.response,
          })
        )
      )
  })

const register = (form: RegisterForm) =>
  new Promise<AuthResponse>((resolve, reject) => {
    API.post(REGISTER_ROUTE, { ...form })
      .then((response) => resolve(response.data))
      .catch((e) =>
        reject(
          Object.assign(new Error(e.message || 'Register request failed'), {
            response: e.response,
          })
        )
      )
  })

const logout = () =>
  new Promise((resolve, reject) => {
    API.post(LOGOUT_ROUTE)
      .then((response) => resolve(response.data))
      .catch((e) =>
        reject(
          Object.assign(new Error(e.message || 'Logout request failed'), {
            response: e.response,
          })
        )
      )
  })

const googleAuth = (payload: GoogleLoginResponse) =>
  new Promise<AuthResponse>((resolve, reject) => {
    API.post(GOOGLE_AUTH_ROUTE, { ...payload })
      .then((response) => resolve(response.data))
      .catch((e) =>
        reject(
          Object.assign(new Error(e.message || 'Google auth request failed'), {
            response: e.response,
          })
        )
      )
  })

const refreshToken = (refreshToken: string) =>
  new Promise<AuthResponse>((resolve, reject) => {
    API.post(REFRESH_ROUTE, { refreshToken })
      .then((response) => resolve(response.data))
      .catch((e) =>
        reject(
          Object.assign(new Error(e.message || 'Token refresh failed'), {
            response: e.response,
          })
        )
      )
  })

export const apiAuth = {
  login,
  register,
  logout,
  googleAuth,
  refreshToken,
} as const
