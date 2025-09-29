import {UserId} from "@entities/user";
import {Nullable} from "@shared/types/global";

export type ListId = string
export type ListType = 'SHOPPING' | 'TODO' | 'OTHER'

export interface UserProfile {
  id: string
  userId: string
  fullName: string
  avatar?: string | null
  notificationsEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface ListOwner {
  id: string
  email: string
  profile: UserProfile
}

export interface ListItem {
  id: string
  content: string
  checked: boolean
  listId: string
  createdAt: string
  updatedAt: string
}

export type ListShare = {
  id: UserId
  email: string
  fullName: string
  avatar: Nullable<string>
}

export interface List {
  id: ListId
  title: string
  type: ListType
  ownerId: string
  createdAt: string
  updatedAt: string
  items: ListItem[]
  owner: ListOwner
  shares: ListShare[]
}

export type ListForm = Pick<List, 'title' | 'type'>
