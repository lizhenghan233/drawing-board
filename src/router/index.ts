import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: () => import('@/views/LoginView.vue') },
    { path: '/rooms', component: () => import('@/views/RoomsView.vue') },
    { path: '/board/:roomId', component: () => import('@/views/BoardView.vue') },
  ],
})

export default router
