export type listId = string;
export type ListType = 'SHOPPING' | 'TODO' | 'OTHER';

export interface List {
  id: listId
  title: string
  type: ListType
  createdAt: string
}

export type ListForm = Pick<List, 'title' | 'type'>

