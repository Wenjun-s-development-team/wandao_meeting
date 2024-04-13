import { createPinia } from 'pinia'
import type { App } from 'vue'
import router from '@/router'

export function registerPlugins(app: App) {
  const pinia = createPinia()

  app.use(pinia)
  app.use(router)
}
