import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import AuthView from '@/views/AuthView.vue'
import ChatView from '@/views/ChatView.vue'
import Logout from '@/views/Logout.vue'
import { useAuth } from '@/composables/useAuth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/auth',
      name: 'auth',
      component:  AuthView,
    },
    {
      path: '/logout',
      name: 'logout',
      component: Logout,
      meta: { requiresAuth: true },
    },
    {
      path: '/chat/:chatId?',
      name: 'chat',
      component:  ChatView,
      meta: { requiresAuth: true },
    },
  ],
})

const { isAuthenticated } = useAuth();

router.beforeEach(async (to, from, next) => {
  if (to.meta.requiresAuth) {
    if (!isAuthenticated.value) {
      return next({ name: 'home' });
    }
  }

  next();
});

export default router
