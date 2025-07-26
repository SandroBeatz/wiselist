import type { RouteRecordRaw } from 'vue-router'

const authRoutes: RouteRecordRaw[] = [
    {
        path: '/auth',
        name: 'Auth',
        component: async () => (await import('@pages/Auth')).AuthPage,
    },
]

export default authRoutes
