import type { RouteRecordRaw } from 'vue-router'

const listsRoutes: RouteRecordRaw[] = [
    {
        path: 'lists',
        name: 'TabLists',
        component: async () => (await import('@pages/Lists')).ListsPage,
    }
]

export default listsRoutes
