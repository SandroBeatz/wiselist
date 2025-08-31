import type { RouteRecordRaw } from 'vue-router'

const listPreviewRoutes: RouteRecordRaw[] = [
    {
        path: '/tabs/lists/:id',
        name: 'ListPreview',
        component: async () => (await import('@pages/ListPreview')).ListPreview,
    },
]

export default listPreviewRoutes
