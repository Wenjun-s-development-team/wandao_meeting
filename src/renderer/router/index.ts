import { createRouter, createWebHashHistory } from 'vue-router'
import NProgress from 'nprogress'

import Layout from '@/layout/index.vue'
import 'nprogress/nprogress.css'

export const constantRoutes = [
  {
    path: '/',
    name: 'app',
    redirect: '/start',
    component: Layout,
    meta: { title: 'App' },
    children: [
      {
        path: '/start',
        name: 'start',
        component: () => import('@/views/start/index.vue'),
        meta: { title: '开始' }
      },
      {
        path: '/room',
        name: 'room',
        component: () => import('@/views/room/index.vue'),
        meta: { title: '房间' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes: constantRoutes
})

router.beforeEach(async () => {
  NProgress.start()
})

router.afterEach(() => {
  NProgress.done()
})

export default router
