import type { RouteRecordRaw } from 'vue-router'

const addItemRoutes: RouteRecordRaw[] = [
  {
    path: '/tabs/lists/:id/add-item',
    name: 'AddItem',
    component: async () => (await import('@pages/AddItem')).AddItem,
  },
]

export default addItemRoutes
