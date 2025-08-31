import type { RouteRecordRaw } from 'vue-router'

const settingsProfileRoutes: RouteRecordRaw[] = [
    {
        path: '/settings-profile',
        name: 'SettingsProfile',
        component: async () => (await import('@pages/SettingsProfile')).SettingsProfilePage,
        meta: {
            middleware: {
                isAuth: true,
            },
        },
    },
]

export default settingsProfileRoutes
