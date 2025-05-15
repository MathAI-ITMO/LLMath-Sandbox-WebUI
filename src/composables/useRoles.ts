import { ref, onMounted } from 'vue'
import Cookies from 'js-cookie'
import axios from 'axios'
import { useAuth } from './useAuth'
import { useRouter } from 'vue-router'

interface UserInfo {
  id: string;
  email: string;
  roles: string[];
}

export function useRoles() {
  const userRoles = ref<string[]>([])
  const isLoading = ref(false)
  const { logout } = useAuth()
  const router = useRouter()

  async function fetchUserInfo(): Promise<UserInfo | null> {
    try {
      const baseUrl = import.meta.env.VITE_MATHLLM_BACKEND_ADDRESS
      const response = await axios.get<UserInfo>(`${baseUrl}/api/Auth/me`, { withCredentials: true })
      return response.data
    } catch (error) {
      console.error('Error fetching user info:', error)
      return null
    }
  }

  async function checkAdminAccess(): Promise<boolean> {
    isLoading.value = true
    try {
      const userInfo = await fetchUserInfo()
      if (!userInfo || !userInfo.roles.includes('Admin')) {
        await logout()
        router.push('/auth')
        return false
      }
      userRoles.value = userInfo.roles
      return true
    } catch (error) {
      console.error('Error checking admin access:', error)
      await logout()
      router.push('/auth')
      return false
    } finally {
      isLoading.value = false
    }
  }

  function hasRole(role: string): boolean {
    return userRoles.value.includes(role)
  }

  function isAdmin(): boolean {
    return hasRole('Admin')
  }

  onMounted(async () => {
    const userInfo = await fetchUserInfo()
    if (userInfo) {
      userRoles.value = userInfo.roles
    }
  })

  return {
    userRoles,
    hasRole,
    isAdmin,
    checkAdminAccess,
    isLoading
  }
} 