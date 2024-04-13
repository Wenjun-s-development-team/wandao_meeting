import { createApp } from 'vue'

import { ElLink } from 'element-plus'

import App from './App.vue'
import { registerPlugins } from '@/plugins'

import 'element-plus/theme-chalk/dark/css-vars.css'
import '@unocss/reset/tailwind.css'
import '@/styles/index.scss'
import 'virtual:uno.css'

const app = createApp(App)

registerPlugins(app)

// 全局组件属性设置
ElLink.props.underline = false

app.mount('#app')
