export interface ActionsDialogProps {
  listId: string
  listTitle: string
  listOwnerId: string
  currentUserId: string
  itemsCount: number
  checkedItemsCount: number
  uncheckedItemsCount: number
}

export type ActionType = 'edit' | 'share' | 'uncheckAll' | 'checkAll' | 'delete'

export interface ActionsDialogResult {
  action: ActionType
}
