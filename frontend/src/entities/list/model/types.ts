export interface List {
  id: string;
  title: string;
  type: 'shopping' | 'todo' | 'other';
  ownerId: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  count_of_items: number;
  assigned_people: string[];
}

