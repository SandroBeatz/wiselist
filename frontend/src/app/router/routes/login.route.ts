import type { RouteRecordRaw } from 'vue-router'

const loginRoutes: RouteRecordRaw[] = [
    {
        path: '/login',
        name: 'Login',
        component: async () => (await import('@/pages/Login')).LoginPage,
    },
]

export default loginRoutes
