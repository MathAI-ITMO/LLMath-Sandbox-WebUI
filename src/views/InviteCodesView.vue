<template>
  <v-layout>
    <v-main>
      <div v-if="isLoading" class="invite-codes-container">
        <v-progress-circular indeterminate></v-progress-circular>
      </div>
      <div v-else-if="hasAccess" class="invite-codes-container">
        <div class="d-flex justify-space-between align-center mb-4">
          <h1>Коды приглашений</h1>
          <v-btn
            color="primary"
            prepend-icon="mdi-plus"
            @click="showCreateDialog = true"
          >
            Создать код
          </v-btn>
        </div>

        <v-alert
          v-if="error && !showErrorDialog"
          type="error"
          class="mb-4"
        >
          {{ error }}
        </v-alert>

        <v-data-table
          :headers="headers"
          :items="inviteCodes"
          :loading="loading"
          class="elevation-1"
        >
          <template v-slot:item.createdBy="{ item }">
            {{ item.createdBy.email }}
          </template>
          <template v-slot:item.usedBy="{ item }">
            <div class="d-flex flex-column">
              <span v-for="user in item.usedBy" :key="user.id">
                {{ user.email }}
              </span>
              <span v-if="item.usedBy.length === 0">-</span>
            </div>
          </template>
          <template v-slot:item.createdAt="{ item }">
            {{ formatDate(item.createdAt) }}
          </template>
          <template v-slot:item.actions="{ item }">
            <v-btn
              icon="mdi-delete"
              color="error"
              variant="text"
              @click.stop="confirmDelete(item)"
            ></v-btn>
          </template>
        </v-data-table>

        <!-- Create Dialog -->
        <v-dialog v-model="showCreateDialog" max-width="400">
          <v-card>
            <v-card-title class="text-h5">
              Создать код приглашения
            </v-card-title>

            <v-card-text>
              <v-form @submit.prevent="createInviteCode">
                <v-text-field
                  v-model="newCode.code"
                  label="Код"
                  required
                  :rules="[v => !!v || 'Код обязателен']"
                ></v-text-field>
                <v-text-field
                  v-model.number="newCode.maxUsages"
                  label="Максимальное количество использований"
                  type="number"
                  required
                  :rules="[
                    v => !!v || 'Количество использований обязательно',
                    v => v > 0 || 'Количество должно быть больше 0'
                  ]"
                ></v-text-field>
              </v-form>
            </v-card-text>

            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn
                color="primary"
                variant="text"
                @click="showCreateDialog = false"
              >
                Отмена
              </v-btn>
              <v-btn
                color="primary"
                :loading="loading"
                @click="createInviteCode"
              >
                Создать
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Delete Confirmation Dialog -->
        <v-dialog v-model="showDeleteDialog" max-width="400">
          <v-card>
            <v-card-title class="text-h5">
              Подтверждение удаления
            </v-card-title>

            <v-card-text>
              Вы уверены, что хотите удалить код приглашения "{{ selectedCode?.code }}"?
            </v-card-text>

            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn
                color="primary"
                variant="text"
                @click="showDeleteDialog = false"
              >
                Отмена
              </v-btn>
              <v-btn
                color="error"
                :loading="loading"
                @click="deleteSelectedCode"
              >
                Удалить
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Error Dialog -->
        <v-dialog v-model="showErrorDialog" max-width="400" @update:model-value="onErrorDialogClose">
          <v-card>
            <v-card-title class="text-h5">
              Ошибка
            </v-card-title>

            <v-card-text>
              {{ error }}
            </v-card-text>

            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn
                color="primary"
                variant="text"
                @click="closeErrorDialog"
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
import { ref, watch } from 'vue'
import { useAdminAccess } from '@/composables/useAdminAccess'
import { useAdminInviteCodes, type InviteCode } from '@/composables/useAdminInviteCodes'

const { hasAccess, isLoading } = useAdminAccess()
const { inviteCodes, loading, error, fetchInviteCodes, createInviteCode: createCode, deleteInviteCode } = useAdminInviteCodes()

const showCreateDialog = ref(false)
const showDeleteDialog = ref(false)
const showErrorDialog = ref(false)
const selectedCode = ref<InviteCode | null>(null)

const newCode = ref({
  code: '',
  maxUsages: 1
})

const headers = [
  { title: 'Код', key: 'code' },
  { title: 'Создан', key: 'createdAt' },
  { title: 'Создал', key: 'createdBy' },
  { title: 'Использований', key: 'currentUsages' },
  { title: 'Макс. использований', key: 'maxUsages' },
  { title: 'Использовали', key: 'usedBy' },
  { title: 'Действия', key: 'actions', sortable: false }
]

const createInviteCode = async () => {
  if (!newCode.value.code || !newCode.value.maxUsages) return

  const success = await createCode({
    code: newCode.value.code,
    maxUsages: newCode.value.maxUsages
  })

  if (success) {
    showCreateDialog.value = false
    newCode.value = { code: '', maxUsages: 1 }
  }
}

const confirmDelete = (item: any) => {
  selectedCode.value = item
  showDeleteDialog.value = true
}

const deleteSelectedCode = async () => {
  if (!selectedCode.value) return

  try {
    const success = await deleteInviteCode(selectedCode.value.id)
    if (success) {
      showDeleteDialog.value = false
      selectedCode.value = null
    } else {
      showDeleteDialog.value = false
      showErrorDialog.value = true
    }
  } catch (err) {
    showDeleteDialog.value = false
    showErrorDialog.value = true
  }
}

const closeErrorDialog = () => {
  showErrorDialog.value = false
  error.value = null
}

const onErrorDialogClose = (value: boolean) => {
  if (!value) {
    error.value = null
  }
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

// Watch for changes in hasAccess and isLoading
watch([hasAccess, isLoading], ([newHasAccess, newIsLoading]) => {
  if (newHasAccess && !newIsLoading) {
    fetchInviteCodes()
  }
}, { immediate: true })
</script>

<style scoped>
.invite-codes-container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}
</style> 