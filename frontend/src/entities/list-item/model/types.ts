export type ListItemId = string

export interface ListItem {
    id: ListItemId
    listId: string
    content: string
    checked: boolean
}

export interface ListItemForm {
    listId: string
    content: string
}
