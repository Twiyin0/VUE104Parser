import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './style.css'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/',           component: () => import('./views/HexParser.vue') },
    { path: '/fileParser', component: () => import('./views/FileParser.vue') },
  ]
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
