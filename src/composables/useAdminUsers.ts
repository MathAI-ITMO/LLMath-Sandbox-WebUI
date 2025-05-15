import { ref } from 'vue'
import axios, { type AxiosInstance } from 'axios'

export interface User {
  id: string
  email: string
  emailConfirmed: boolean
  lockoutEnabled: boolean
  lockoutEnd: string | null
  roles: string[]
  usedInviteCode: {
    id: string
    code: string
    createdAt: string
    createdBy: {
      id: string
      email: string
    }
  } | null
}

const baseUrl = import.meta.env.VITE_MATHLLM_BACKEND_ADDRESS

export function useAdminUsers() {
  const client: AxiosInstance = axios.create({
    baseURL: baseUrl,
  })

  const users = ref<User[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchUsers = async () => {
    loading.value = true
    error.value = null
    
    try {
      const response = await client.get<User[]>('/api/admin/users', { withCredentials: true })
      users.value = response.data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch users'
      console.error('Error fetching users:', err)
    } finally {
      loading.value = false
    }
  }

  const promoteToAdmin = async (userId: string) => {
    try {
      await client.post(`/api/admin/users/promote?userId=${userId}`, {}, { withCredentials: true })
      await fetchUsers() // Refresh the users list after promotion
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to promote user'
      console.error('Error promoting user:', err)
      return false
    }
  }

  return {
    users,
    loading,
    error,
    fetchUsers,
    promoteToAdmin
  }
} 