import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import { autoAnimatePlugin } from '@formkit/auto-animate/vue'
import '@shared/utils/auth-debug.utils' // Development debugging tools

import { IonicVue } from '@ionic/vue'

/* Theme variables */
import './theme/variables.css'

/* Core CSS required for Ionic components to work properly */
import '@ionic/vue/css/core.css'

/* Basic CSS for apps built with Ionic */
import '@ionic/vue/css/normalize.css'
import '@ionic/vue/css/structure.css'
import '@ionic/vue/css/typography.css'

/* Optional CSS utils that can be commented out */
import '@ionic/vue/css/padding.css'
// import '@ionic/vue/css/float-elements.css';
// import '@ionic/vue/css/text-alignment.css';
// import '@ionic/vue/css/text-transformation.css';
// import '@ionic/vue/css/flex-utils.css';
// import '@ionic/vue/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

// import '@ionic/vue/css/palettes/dark.always.css';
// import '@ionic/vue/css/palettes/dark.system.css';

import './assets/css/main.css'

const pinia = createPinia()

const app = createApp(App).use(IonicVue).use(pinia).use(autoAnimatePlugin).use(router)

router.isReady().then(async () => {
  app.mount('#app')

  // Initialize user session and start token monitoring
  // const userStore = useUserStore()
  // await userStore.initUser()
  // tokenMonitorService.startMonitoring()
})
