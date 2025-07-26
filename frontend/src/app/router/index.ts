import {createRouter, createWebHistory} from '@ionic/vue-router';
import {RouteRecordRaw} from 'vue-router';
import authRoutes from "@/app/router/routes/auth.route";
import loginRoutes from "@/app/router/routes/login.route";
import registerRoutes from "@/app/router/routes/register.route";
import settingsRoutes from "@/app/router/routes/settings.route";
import listsRoutes from "@/app/router/routes/lists.route";

const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        redirect: '/tabs/lists'
    },
    {
        path: '/tabs/',
        component: async () => (await import('@/app/ui/MainLayout')).MainLayout,
        children: [
            {path: '', redirect: '/tabs/lists'},
            ...listsRoutes,
            ...settingsRoutes,
        ]
    },
    ...authRoutes,
    ...loginRoutes,
    ...registerRoutes
]

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes
})

export default router
