export type listId = string;
export type ListType = 'SHOPPING' | 'TODO' | 'OTHER';

export interface UserProfile {
  id: string;
  userId: string;
  fullName: string;
  avatar?: string | null;
  notificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListOwner {
  id: string;
  email: string;
  profile: UserProfile;
}

export interface ListItem {
  id: string;
  content: string;
  checked: boolean;
  listId: string;
  createdAt: string;
  updatedAt: string;
}

export interface List {
  id: listId;
  title: string;
  type: ListType;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  items: ListItem[];
  owner: ListOwner;
}

export type ListForm = Pick<List, 'title' | 'type'>

