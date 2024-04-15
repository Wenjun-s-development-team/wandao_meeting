import { createPinia } from 'pinia'
import piniaPluginPersist from 'pinia-plugin-persist'
import type { App } from 'vue'
import router from '@/router'

export function registerPlugins(app: App) {
  const pinia = createPinia()

  pinia.use(piniaPluginPersist)

  app.use(pinia)
  app.use(router)
}
