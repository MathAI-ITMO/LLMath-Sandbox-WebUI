import { onMounted, ref } from 'vue'
import { useRoles } from './useRoles'

export function useAdminAccess() {
  const { checkAdminAccess, isLoading } = useRoles()
  const hasAccess = ref(false)

  onMounted(async () => {
    hasAccess.value = await checkAdminAccess()
  })

  return {
    hasAccess,
    isLoading
  }
} 