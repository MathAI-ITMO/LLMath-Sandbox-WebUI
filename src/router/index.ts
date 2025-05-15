import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import AuthView from '@/views/AuthView.vue'
import ChatView from '@/views/ChatView.vue'
import Logout from '@/views/Logout.vue'
import UsersView from '@/views/UsersView.vue'
import InviteCodesView from '@/views/InviteCodesView.vue'
import { useAuth } from '@/composables/useAuth'
import { useRoles } from '@/composables/useRoles'

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
    {
      path: '/users',
      name: 'users',
      component: UsersView,
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/invite-codes',
      name: 'invite-codes',
      component: InviteCodesView,
      meta: { requiresAuth: true, requiresAdmin: true },
    },
  ],
})

const { isAuthenticated, checkAuth } = useAuth();
const { checkAdminAccess } = useRoles();

router.beforeEach(async (to, from, next) => {
  if (to.meta.requiresAuth) {
    const isAuth = await checkAuth();
    if (!isAuth) {
      return next({ name: 'auth' });
    }
    
    if (to.meta.requiresAdmin) {
      const hasAdminAccess = await checkAdminAccess();
      if (!hasAdminAccess) {
        return next({ name: 'home' });
      }
    }
  }
  next();
});

export default router
