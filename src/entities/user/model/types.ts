import type { Nullable } from '@shared/types/global'

export type UserId = string

export type UserProfile = {
  fullName: string
  avatar: Nullable<string>
  avatar_icon?: string
}

export interface User {
  id: UserId
  email: string
  profile: UserProfile
}
