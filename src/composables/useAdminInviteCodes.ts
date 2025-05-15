import { ref } from 'vue'
import axios, { type AxiosInstance, AxiosError } from 'axios'

export interface InviteCodeUser {
  id: string
  email: string
}

export interface InviteCode {
  id: string
  code: string
  maxUsages: number
  currentUsages: number
  createdAt: string
  createdBy: InviteCodeUser
  usedBy: InviteCodeUser[]
}

export interface CreateInviteCodeRequest {
  code: string
  maxUsages: number
}

const baseUrl = import.meta.env.VITE_MATHLLM_BACKEND_ADDRESS

export function useAdminInviteCodes() {
  const client: AxiosInstance = axios.create({
    baseURL: baseUrl,
  })

  const inviteCodes = ref<InviteCode[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchInviteCodes = async () => {
    loading.value = true
    error.value = null
    
    try {
      const response = await client.get<InviteCode[]>('/api/admin/invite-codes', { withCredentials: true })
      inviteCodes.value = response.data
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError
        error.value = typeof axiosError.response?.data === 'string' 
          ? axiosError.response.data 
          : 'Failed to fetch invite codes'
      } else {
        error.value = err instanceof Error ? err.message : 'Failed to fetch invite codes'
      }
      console.error('Error fetching invite codes:', err)
    } finally {
      loading.value = false
    }
  }

  const createInviteCode = async (request: CreateInviteCodeRequest): Promise<boolean> => {
    loading.value = true
    error.value = null

    try {
      await client.post<InviteCode>('/api/admin/invite-codes', request, { withCredentials: true })
      await fetchInviteCodes()
      return true
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError
        error.value = typeof axiosError.response?.data === 'string' 
          ? axiosError.response.data 
          : 'Failed to create invite code'
      } else {
        error.value = err instanceof Error ? err.message : 'Failed to create invite code'
      }
      console.error('Error creating invite code:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  const deleteInviteCode = async (id: string): Promise<boolean> => {
    loading.value = true
    error.value = null

    try {
      await client.delete(`/api/admin/invite-codes/${id}`, { withCredentials: true })
      await fetchInviteCodes()
      return true
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError
        error.value = typeof axiosError.response?.data === 'string' 
          ? axiosError.response.data 
          : 'Failed to delete invite code'
      } else {
        error.value = err instanceof Error ? err.message : 'Failed to delete invite code'
      }
      console.error('Error deleting invite code:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    inviteCodes,
    loading,
    error,
    fetchInviteCodes,
    createInviteCode,
    deleteInviteCode
  }
} 