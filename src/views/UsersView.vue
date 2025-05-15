<template>
  <v-layout>
    <v-main>
      <div v-if="isLoading" class="users-container">
        <v-progress-circular indeterminate></v-progress-circular>
      </div>
      <div v-else-if="hasAccess" class="users-container">
        <div class="d-flex justify-space-between align-center mb-4">
          <h1>Управление пользователями</h1>
          <v-text-field
            v-model="search"
            prepend-inner-icon="mdi-magnify"
            label="Поиск пользователей"
            single-line
            hide-details
            density="compact"
            class="search-field"
            style="max-width: 300px"
          ></v-text-field>
        </div>

        <v-alert
          v-if="error"
          type="error"
          class="mb-4"
        >
          {{ error }}
        </v-alert>

        <v-data-table
          :headers="headers"
          :items="filteredUsers"
          :loading="loading"
          class="elevation-1"
          @click:row="showUserDetails"
        >
          <template v-slot:item.roles="{ item }">
            <v-chip
              v-for="role in item.roles"
              :key="role"
              class="mr-1"
              :color="role === 'Admin' ? 'primary' : 'secondary'"
              size="small"
            >
              {{ role }}
            </v-chip>
          </template>
          <template v-slot:item.inviteCode="{ item }">
            <v-btn
              v-if="item.usedInviteCode"
              variant="text"
              color="primary"
              @click.stop="navigateToInviteCode(item.usedInviteCode.id)"
            >
              {{ item.usedInviteCode.code }}
            </v-btn>
            <span v-else>-</span>
          </template>
        </v-data-table>

        <v-dialog v-model="showDialog" max-width="400">
          <v-card v-if="selectedUser">
            <v-card-title class="text-h5">
              Информация о пользователе
            </v-card-title>

            <v-card-text>
              <div class="mb-2">
                <strong>ID:</strong> {{ selectedUser.id }}
              </div>
              <div class="mb-2">
                <strong>Email:</strong> {{ selectedUser.email }}
              </div>
              <div class="mb-2">
                <strong>Роли:</strong>
                <template v-if="selectedUser.roles && selectedUser.roles.length > 0">
                  <v-chip
                    v-for="role in selectedUser.roles"
                    :key="role"
                    class="ml-1"
                    :color="role === 'Admin' ? 'primary' : 'secondary'"
                    size="small"
                  >
                    {{ role }}
                  </v-chip>
                </template>
                <span v-else>-</span>
              </div>
              <div class="mb-2">
                <strong>Код приглашения:</strong>
                <span v-if="selectedUser.usedInviteCode">
                  {{ selectedUser.usedInviteCode.code }}
                </span>
                <span v-else>-</span>
              </div>
            </v-card-text>

            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn
                v-if="selectedUser.roles && !selectedUser.roles.includes('Admin')"
                color="primary"
                variant="tonal"
                :loading="promotingUser"
                @click="promoteToAdmin"
              >
                Сделать администратором
              </v-btn>
              <v-btn
                color="primary"
                variant="text"
                @click="showDialog = false"
              >
                Закрыть
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </div>
    </v-main>
  </v-layout>
</template>

<script setup lang="ts">
import { onMounted, watch, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminAccess } from '@/composables/useAdminAccess'
import { useAdminUsers } from '@/composables/useAdminUsers'
import type { User } from '@/composables/useAdminUsers'

const router = useRouter()
const { hasAccess, isLoading } = useAdminAccess()
const { users, loading, error, fetchUsers, promoteToAdmin: promoteUserToAdmin } = useAdminUsers()

const search = ref('')
const showDialog = ref(false)
const selectedUser = ref<User | null>(null)
const promotingUser = ref(false)

const filteredUsers = computed(() => {
  if (!search.value) return users.value
  
  const searchLower = search.value.toLowerCase()
  return users.value.filter(user => 
    user.email.toLowerCase().includes(searchLower) ||
    user.id.toLowerCase().includes(searchLower)
  )
})

const headers = [
  { title: 'ID', key: 'id' },
  { title: 'Email', key: 'email' },
  { title: 'Роли', key: 'roles' },
  { title: 'Код приглашения', key: 'inviteCode' }
]

const showUserDetails = (event: any, item: any) => {
  selectedUser.value = item.item
  showDialog.value = true
}

const navigateToInviteCode = (codeId: string) => {
  router.push(`/invite-codes?id=${codeId}`)
}

const promoteToAdmin = async () => {
  if (!selectedUser.value) return
  
  promotingUser.value = true
  try {
    const success = await promoteUserToAdmin(selectedUser.value.id)
    if (success) {
      showDialog.value = false
    }
  } catch (err) {
    console.error('Error promoting user:', err)
  } finally {
    promotingUser.value = false
  }
}

// Watch for changes in hasAccess and isLoading
watch([hasAccess, isLoading], ([newHasAccess, newIsLoading]) => {
  if (newHasAccess && !newIsLoading) {
    fetchUsers()
  }
}, { immediate: true })
</script>

<style scoped>
.users-container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.search-field {
  margin-left: 1rem;
}
</style> 