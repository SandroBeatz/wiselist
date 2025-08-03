import type { RouteRecordRaw } from 'vue-router'

const listsRoutes: RouteRecordRaw[] = [
    {
        path: 'lists',
        name: 'TabLists',
        component: async () => (await import('@pages/Lists')).ListsPage,
    },
    {
        path: 'lists/:id',
        name: 'ListPreview',
        component: async () => (await import('@pages/ListPreview')).ListPreview,
    },
]

export default listsRoutes
