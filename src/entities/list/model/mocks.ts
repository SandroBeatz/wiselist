import type { List } from './types'

export const mockLists: List[] = [
  {
    id: '1',
    title: 'Groceries',
    type: 'shopping',
    ownerId: 'user-1',
    createdAt: '2025-08-01T10:00:00Z',
    updatedAt: '2025-08-01T12:00:00Z',
    count_of_items: 8,
    assigned_people: ['Alice', 'Bob'],
  },
  {
    id: '2',
    title: 'Work Tasks',
    type: 'todo',
    ownerId: 'user-2',
    createdAt: '2025-08-02T09:00:00Z',
    updatedAt: '2025-08-02T10:00:00Z',
    count_of_items: 5,
    assigned_people: ['Charlie'],
  },
  {
    id: '3',
    title: 'Party Prep',
    type: 'other',
    ownerId: 'user-1',
    createdAt: '2025-08-03T08:00:00Z',
    updatedAt: '2025-08-03T09:00:00Z',
    count_of_items: 12,
    assigned_people: ['Alice', 'David', 'Eve'],
  },
]
