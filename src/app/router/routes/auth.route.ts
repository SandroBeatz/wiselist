import type { RouteRecordRaw } from 'vue-router'

const authRoutes: RouteRecordRaw[] = [
  {
    path: '/auth',
    name: 'Auth',
    component: async () => (await import('@pages/Auth')).AuthPage,
    meta: {
      middleware: {
        isGuest: true,
      },
    },
  },
]

export default authRoutes
