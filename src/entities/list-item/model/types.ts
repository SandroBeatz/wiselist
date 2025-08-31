import type { ListId } from '@/entities/list/@x/list-item'

export type ListItemId = string

export interface ListItem {
  id: ListItemId
  listId: string
  content: string
  checked: boolean
}

export interface ListItemForm {
  listId: ListId
  content: string
  context?: string
  [key: string]: string | undefined
}
