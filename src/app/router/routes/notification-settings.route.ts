import type { RouteRecordRaw } from 'vue-router'

const notificationSettingsRoutes: RouteRecordRaw[] = [
  {
    path: '/settings/notifications',
    name: 'NotificationSettings',
    component: async () => (await import('@pages/NotificationSettings')).NotificationSettingsPage,
    meta: {
      middleware: {
        isAuth: true,
      },
    },
  },
]

export default notificationSettingsRoutes
