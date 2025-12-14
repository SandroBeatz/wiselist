import type { RouteRecordRaw } from 'vue-router'

const aboutRoutes: RouteRecordRaw[] = [
  {
    path: '/about',
    name: 'About',
    component: async () => (await import('@pages/About')).AboutPage,
    meta: {
      middleware: {
        isAuth: true,
      },
    },
  },
]

export default aboutRoutes
