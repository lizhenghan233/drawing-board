import { createRouter, createWebHistory } from 'vue-router'
const routes = [
  {
    path: '/',
    redirect: '/login',
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/rooms',
    name: 'Rooms',
    component: () => import('@/views/RoomsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/board/:roomId',
    name: 'Board',
    component: () => import('@/views/BoardView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login',
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach((to, _from) => {
  const requiresAuth = to.meta.requiresAuth
  const isLogin = localStorage.getItem('token')
  if (requiresAuth && !isLogin) {
    return '/login'
  }
  return true
})

export default router
