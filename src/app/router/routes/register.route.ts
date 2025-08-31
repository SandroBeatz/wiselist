import type { RouteRecordRaw } from 'vue-router'

const registerRoutes: RouteRecordRaw[] = [
    {
        path: '/register',
        name: 'Register',
        component: async () => (await import('@pages/Register')).RegisterPage,
        meta: {
            middleware: {
                isGuest: true,
            },
        },
    },
]

export default registerRoutes
