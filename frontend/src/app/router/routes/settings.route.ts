import type { RouteRecordRaw } from 'vue-router'

const settingsRoutes: RouteRecordRaw[] = [
    {
        path: 'settings',
        name: 'TabSettings',
        component: async () => (await import('@/pages/Settings')).SettingsPage,
    },
]

export default settingsRoutes
