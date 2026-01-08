<template>
  <div class="chat-container">
    <v-navigation-drawer
      v-model="sidebarOpen"
      permanent
      class="chat-sidebar"
    >
      <div class="sidebar-header">
        <v-divider></v-divider>
        <v-card-actions class="justify-center pa-4">
          <v-btn
            class="new-chat-button"
            variant="tonal"
            block
            :disabled="!chatId"
            @click="createNewChat()"
          >
            <v-icon icon="mdi-plus" class="mr-2" />
            Новый чат
          </v-btn>
        </v-card-actions>
        <v-divider></v-divider>
      </div>

      <v-list class="chat-list">
        <v-list-item
          v-for="chatItem in chats"
          :key="chatItem.id"
          link
          :active="chatId === chatItem.id"
          @click="onChatSelect(chatItem.id)"
          class="chat-list-item"
        >
          <template v-slot:prepend>
            <v-icon :icon="chatItem.type === 'ProblemSolver' ? 'mdi-function' : 'mdi-chat'" class="mr-2"></v-icon>
          </template>

          <v-list-item-title>
            {{ chatItem.name }}
          </v-list-item-title>

          <template v-slot:append>
            <v-btn
              variant="text"
              density="comfortable"
              icon="mdi-delete"
              color="error"
              @click.stop="onChatDelete(chatItem.id)"
              class="delete-btn"
            >
            </v-btn>
          </template>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <div class="top-panel">
      <v-app-bar flat class="px-4">
        <v-btn
          icon
          variant="text"
          @click="sidebarOpen = !sidebarOpen"
          class="sidebar-toggle"
        >
          <v-icon>mdi-message-outline</v-icon>
        </v-btn>

        <v-btn
          icon
          variant="text"
          :to="userTaskId ? `/select-task?taskType=${taskType}` : '/'"
          class="ml-2 nav-button"
        >
          <v-icon>{{ userTaskId ? 'mdi-view-list' : 'mdi-home' }}</v-icon>
        </v-btn>

        <v-app-bar-title class="ml-4">
          {{ chat?.name || 'Новый чат' }}
        </v-app-bar-title>
        <v-spacer></v-spacer>
        <v-btn
          v-if="userTaskId && taskStatus === UserTaskStatus.Solved"
          variant="elevated"
          color="success"
          class="solved-btn"
          density="comfortable"
          disabled
        >
          Задача отмечена решенной
        </v-btn>
        <v-btn
          v-else-if="userTaskId && taskStatus !== UserTaskStatus.Solved"
          variant="outlined"
          color="success"
          :loading="markingSolved"
          @click="markTaskSolved"
          class="mark-solved-btn"
          density="comfortable"
        >
          Отметить задачу решенной
        </v-btn>
      </v-app-bar>
    </div>

    <div class="chat-content">
      <template v-if="!chatId">
        <v-card class="new-chat-card">
          <v-card-title class="pb-4">Создание нового чата</v-card-title>
          <v-radio-group
            v-model="chatMode"
            inline
            density="comfortable"
            class="mb-4"
            :disabled="isCreatingChat"
          >
            <v-radio
              label="Чат"
              value="chat"
            ></v-radio>
            <v-radio
              label="Решение задач"
              value="problem-solving"
            ></v-radio>
          </v-radio-group>
          <v-row align="center" no-gutters>
            <v-col>
              <v-text-field
                hide-details="auto"
                label="Название чата"
                variant="solo"
                density="comfortable"
                bg-color="surface"
                v-model="chatName"
                class="chat-input"
                :disabled="isCreatingChat"
                :error="hasDuplicateName"
              ></v-text-field>
            </v-col>
            <v-col cols="auto" class="pl-2">
              <v-btn
                variant="tonal"
                :disabled="isCreateDisabled"
                @click="onChatCreate"
                class="action-button"
                :loading="isCreatingChat"
                :color="needsConfirmation ? 'error' : undefined"
              >{{ needsConfirmation ? 'Подтвердить' : 'Создать' }}</v-btn>
            </v-col>
          </v-row>
          <v-alert
            v-if="hasDuplicateName && needsConfirmation"
            type="error"
            density="compact"
            class="mt-2"
            variant="tonal"
          >
            Чат с таким именем существует. Нажмите "Подтвердить" для подтверждения.
          </v-alert>
          <template v-if="chatMode === 'problem-solving'">
            <v-row align="center" no-gutters class="mt-4">
              <v-col>
                <v-text-field
                  v-model="searchQuery"
                  label="Поиск задач"
                  variant="solo"
                  density="comfortable"
                  bg-color="surface"
                  prepend-inner-icon="mdi-magnify"
                  clearable
                  class="chat-input"
                  hide-details="auto"
                  @keyup.enter="onSearch"
                  :disabled="isCreatingChat"
                ></v-text-field>
              </v-col>
              <v-col cols="auto" class="pl-2">
                <v-btn
                  variant="tonal"
                  @click="onSearch"
                  class="action-button"
                  :loading="isLoading"
                  :disabled="isCreatingChat"
                >Поиск</v-btn>
              </v-col>
            </v-row>
            <v-card class="mt-4 problems-card">
              <v-list lines="one" class="problems-list">
                <template v-if="isLoading">
                  <v-list-item v-for="n in 5" :key="n">
                    <v-skeleton-loader type="list-item"></v-skeleton-loader>
                  </v-list-item>
                </template>
                <template v-else>
                  <v-list-item
                    v-for="problem in problems"
                    :key="problem.hash"
                    :value="problem.name"
                    @click="() => {
                      selectedProblem = problem.name;
                      selectedProblemHash = problem.hash;
                    }"
                    :active="selectedProblem === problem.name"
                    class="problem-item"
                    :disabled="isCreatingChat"
                  >
                    <v-list-item-title>{{ problem.name }}</v-list-item-title>
                  </v-list-item>
                </template>
              </v-list>
              <v-card-actions class="justify-center pa-2">
                <v-pagination
                  v-model="page"
                  :length="pageCount"
                  :total-visible="5"
                  density="comfortable"
                  :disabled="isLoading || isCreatingChat"
                ></v-pagination>
              </v-card-actions>
            </v-card>
          </template>
        </v-card>
      </template>
      <template v-else>
        <div ref="messagesCard" class="messages-wrapper">
          <div class="messages-container">

			<div class="messages-list">
			  <!-- блок 'пока нет сообщений' -->
			  <template v-if="messages.length === 0">
				<div class="no-messages">
				  <div class="text-center">
					Сообщений пока нет, напишите первое сообщение
				  </div>
				</div>
			  </template>

			  <!-- список сообщений -->
			  <MessageItem
				v-for="m in messages"
				:key="m.id"
				:message="m"
			  />
			</div>

          </div>
        </div>

        <div ref="inputCard" class="input-container">
          <div class="input-panel">
            <v-text-field
              hide-details="auto"
              placeholder="Введите сообщение..."
              v-model="currentMessageText"
              auto-grow
              rows="1"
              max-rows="1"
              variant="outlined"
              density="comfortable"
              class="message-input"
              @keyup.enter="sendMessage"
            ></v-text-field>
            <v-btn
              @click="sendMessage"
              :disabled="isSending"
              :loading="isSending"
              color="primary"
              variant="elevated"
              class="send-button"
            >
              <v-icon icon="mdi-send" class="mr-1"></v-icon>
              Отправить
            </v-btn>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: 'ChatMessages'
})

const emit = defineEmits(['chatSelected', 'chatDeleted', 'update:chatId'])

import { useChatView } from '@/composables/useChatView'

const props = defineProps({
  chatId: String,
})

const {
  chatId,
  messagesCard,
  chatName,
  chatMode,
  selectedProblem,
  selectedProblemHash,
  searchQuery,
  problems,
  page,
  isLoading,
  isCreatingChat,
  hasDuplicateName,
  needsConfirmation,
  pageCount,
  isCreateDisabled,
  sidebarOpen,
  chats,
  chat,
  messages,
  currentMessageText,
  isSending,
  userTaskId,
  taskStatus,
  taskType,
  markingSolved,
  sendMessage,
  onChatCreate,
  onChatSelect,
  onChatDelete,
  createNewChat,
  onSearch,
  markTaskSolved,
  UserTaskStatus
} = useChatView(props, emit)
</script>

<style lang="css" scoped>
.chat-container {
  height: 100dvh;
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.top-panel {
  flex: 0 0 auto;
}

.chat-content {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  padding-top: var(--v-layout-top);
  background-color: var(--v-theme-background);
}

.messages-wrapper {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 1rem;
  min-height: 0;
}

.messages-container {
  width: 90%;
  max-width: 75rem;
  margin: 0 auto;
}

.messages-list {
  padding: 1rem;
  --v-border-opacity: 0;
  background-color: transparent !important;
}

.no-messages {
  padding: 2rem;
  text-align: center;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.input-container {
  flex: 0 0 auto;
  padding: 1rem;
  background: var(--v-theme-background);
  position: sticky;
  bottom: 0;
  z-index: 10;
}

.input-panel {
  width: 90%;
  max-width: 75rem;
  margin: 0 auto;
  display: flex;
  align-items: center;
  border-radius: 1.25rem;
  border: 2px solid rgba(var(--v-theme-primary), 0.7);
  padding: 0.5rem 0.5rem 0.5rem 1.5rem;
  background-color: var(--v-theme-background);
  min-height: 4.25rem;
}

.input-panel:focus-within {
  border-color: white;
}

.message-input {
  flex: 1;
}

.message-input :deep(.v-field__input) {
  padding: 0.5rem 0;
  min-height: 2.75rem;
}

.message-input :deep(.v-field__outline) {
  display: none;
}

.send-button {
  margin-left: 0.5rem;
  border-radius: 0.75rem;
  transition: all 0.3s ease;
}

.send-button:hover {
  background-color: white !important;
  color: rgba(var(--v-theme-primary), 1) !important;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.sidebar-toggle {
  color: rgba(var(--v-theme-primary), 0.8);
}

.nav-button {
  color: rgba(var(--v-theme-primary), 0.8);
}

.v-btn {
  border-radius: 0.75rem;
}

.mark-solved-btn {
  transition: all 0.3s ease;
  border-color: rgba(var(--v-theme-success), 0.7) !important;
  color: rgba(var(--v-theme-success), 0.9) !important;
  font-size: 0.875rem;
  text-transform: none;
}

.mark-solved-btn:hover {
  background-color: rgba(var(--v-theme-success), 0.9) !important;
  color: white !important;
  border-color: rgba(var(--v-theme-success), 0.9) !important;
}

.solved-btn {
  background-color: rgb(0 0 0) !important;
  color: #00ff32 !important;
  font-size: 0.875rem;
  text-transform: none;
  font-weight: 500;
  letter-spacing: 0.5px;
  opacity: 1 !important;
}

.new-chat-card {
  width: 90%;
  max-width: 75rem;
  margin: 2rem auto;
  padding: 1rem;
  border-radius: 1rem;
}

.margin-before {
  margin: 0 2rem 1rem 2rem;
}

.chat-sidebar {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.sidebar-header {
  flex-shrink: 0;
}

.chat-list {
  flex-grow: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.new-chat-button {
  width: 100%;
}

.chat-list-item {
  margin: 0.25rem 0.5rem;
  border-radius: 1rem;
  transition: all 0.2s ease;
}

.chat-list-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.1);
}

.chat-list-item .delete-btn {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.chat-list-item:hover .delete-btn {
  opacity: 1;
}

.v-list-item--active {
  background-color: rgba(var(--v-theme-primary), 0.15);
}

.chat-input :deep(.v-field__input) {
  min-height: 48px !important;
  padding: 0 1rem;
}

.chat-input :deep(.v-field) {
  border-radius: 0.75rem;
}

.action-button {
  height: 48px;
  min-width: 100px;
}

.problems-card {
  border-radius: 0.75rem;
  overflow: hidden;
}

.problems-list {
  max-height: 300px;
  overflow-y: auto;
}

.problem-item {
  transition: all 0.2s ease;
  border-radius: 0.5rem;
  margin: 0.25rem;
}

.problem-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.1);
}

/* Стили для правильного отображения матриц KaTeX */
:deep(.katex) {
  display: inline-block;
}

:deep(.katex .base) {
  display: inline-block;
}
</style>
