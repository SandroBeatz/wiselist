import { createRouter, createWebHistory } from '@ionic/vue-router'
import type { RouteRecordRaw } from 'vue-router'
import authRoutes from '@/app/router/routes/auth.route'
import loginRoutes from '@/app/router/routes/login.route'
import registerRoutes from '@/app/router/routes/register.route'
import settingsRoutes from '@/app/router/routes/settings.route'
import listsRoutes from '@/app/router/routes/lists.route'
import { tokenService } from '@shared/services/token.service'
import settingsProfileRoutes from '@app/router/routes/settings-profile.route'
import listPreviewRoutes from '@app/router/routes/list-preview.route'
import addItemRoutes from '@app/router/routes/add-item.route'

declare module 'vue-router' {
  interface RouteMeta {
    middleware?: {
      isAuth?: boolean
      isGuest?: boolean
    }
  }

  export class useRoute {}
}

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/tabs/lists',
  },
  {
    path: '/tabs/',
    component: async () => (await import('@/app/ui/MainLayout')).MainLayout,
    meta: {
      middleware: {
        isAuth: true,
      },
    },
    children: [{ path: '', redirect: '/tabs/lists' }, ...listsRoutes, ...settingsRoutes],
  },
  ...authRoutes,
  ...loginRoutes,
  ...registerRoutes,

  ...listPreviewRoutes,
  ...addItemRoutes,
  ...settingsProfileRoutes,
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach((to, from, next) => {
  const isAuth = to.matched.some((record) => record.meta.middleware?.isAuth)
  const isGuest = to.matched.some((record) => record.meta.middleware?.isGuest)

  // Check if user is authenticated (has valid access token or refresh token)
  const isAuthenticated = tokenService.isAuthenticated()

  if (isAuth && !isAuthenticated) {
    next({
      name: 'Auth',
      query: { redirect: to.fullPath },
    })
  } else if (isAuthenticated && isGuest) {
    next({ name: 'TabLists' })
  } else {
    next()
  }
})

export default router
