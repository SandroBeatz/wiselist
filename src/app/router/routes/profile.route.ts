import type { RouteRecordRaw } from 'vue-router'

const profileRoutes: RouteRecordRaw[] = [
  {
    path: '/profile',
    name: 'Profile',
    component: async () => (await import('@pages/Profile')).ProfilePage,
    meta: {
      middleware: {
        isAuth: true,
      },
    },
  },
]

export default profileRoutes
