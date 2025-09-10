import { API } from '@shared/instances/axios'
import type { User } from '../model/types'

const GET_ME = 'auth/me'
const UPDATE_PROFILE = 'auth/profile'
const CHANGE_PASSWORD = 'auth/change-password'

export interface UpdateProfilePayload {
  fullName: string
  email: string
  avatar_icon?: string
}

export interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
}

const getMe = () =>
  new Promise<User>((resolve, reject) => {
    API.get(GET_ME)
      .then((response) => resolve(response.data))
      .catch((e) =>
        reject(
          Object.assign(new Error(e.message || ''), {
            response: e.response,
          })
        )
      )
  })

const updateProfile = (payload: UpdateProfilePayload) =>
  new Promise<User>((resolve, reject) => {
    API.put(UPDATE_PROFILE, payload)
      .then((response) => resolve(response.data))
      .catch((e) =>
        reject(
          Object.assign(new Error(e.message || ''), {
            response: e.response,
          })
        )
      )
  })

const changePassword = (payload: ChangePasswordPayload) =>
  new Promise<{ message: string }>((resolve, reject) => {
    API.put(CHANGE_PASSWORD, payload)
      .then((response) => resolve(response.data))
      .catch((e) =>
        reject(
          Object.assign(new Error(e.message || ''), {
            response: e.response,
          })
        )
      )
  })

export const apiUser = {
  getMe,
  updateProfile,
  changePassword,
} as const
