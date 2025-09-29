import type { List } from './types'

export const mockLists: List[] = [
  {
    id: '1',
    title: 'Groceries',
    type: 'SHOPPING',
    ownerId: 'user-1',
    createdAt: '2025-08-01T10:00:00Z',
    updatedAt: '2025-08-01T12:00:00Z',
    items: [],
    owner: {
      id: 'user-1',
      email: 'user1@example.com',
      profile: {
        id: 'profile-1',
        userId: 'user-1',
        fullName: 'Alice Johnson',
        avatar: null,
        notificationsEnabled: true,
        createdAt: '2025-08-01T10:00:00Z',
        updatedAt: '2025-08-01T10:00:00Z',
      }
    },
  },
  {
    id: '2',
    title: 'Work Tasks',
    type: 'TODO',
    ownerId: 'user-2',
    createdAt: '2025-08-02T09:00:00Z',
    updatedAt: '2025-08-02T10:00:00Z',
    items: [],
    owner: {
      id: 'user-2',
      email: 'user2@example.com',
      profile: {
        id: 'profile-2',
        userId: 'user-2',
        fullName: 'Bob Smith',
        avatar: null,
        notificationsEnabled: true,
        createdAt: '2025-08-02T09:00:00Z',
        updatedAt: '2025-08-02T09:00:00Z',
      }
    },
  },
  {
    id: '3',
    title: 'Party Prep',
    type: 'OTHER',
    ownerId: 'user-1',
    createdAt: '2025-08-03T08:00:00Z',
    updatedAt: '2025-08-03T09:00:00Z',
    items: [],
    owner: {
      id: 'user-1',
      email: 'user1@example.com',
      profile: {
        id: 'profile-1',
        userId: 'user-1',
        fullName: 'Alice Johnson',
        avatar: null,
        notificationsEnabled: true,
        createdAt: '2025-08-01T10:00:00Z',
        updatedAt: '2025-08-01T10:00:00Z',
      }
    },
  },
]
