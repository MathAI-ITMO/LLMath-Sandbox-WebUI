<template>
  <div class="chat-container">
    <v-navigation-drawer
      v-model="sidebarOpen"
      permanent
      class="chat-sidebar"
    >
      <div class="sidebar-header">
        <v-btn
          block
          color="primary"
          prepend-icon="mdi-plus"
          @click="createNewChat"
          class="new-chat-button"
        >
          Новый чат
        </v-btn>
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
          {{ chat?.name || 'Чат' }}
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
      <template v-if="chatId">
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
              <message-item
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

      <template v-else>
        <div class="no-chat-selected">
          <v-container class="fill-height">
            <v-row justify="center" align="center">
              <v-col cols="12" sm="8" md="6" class="text-center">
                <v-icon size="64" color="primary" class="mb-4">mdi-chat-processing-outline</v-icon>
                <h2 class="text-h4 mb-4">Выберите чат для начала общения</h2>
                <p class="text-body-1 mb-6 text-medium-emphasis">
                  Выберите существующий чат из списка ниже или создайте новый, чтобы начать обсуждение математических задач.
                </p>

                <v-card variant="outlined" class="pa-0 mb-6 chat-list-card">
                  <v-list class="text-left py-0">
                    <v-list-subheader>Ваши чаты</v-list-subheader>
                    <v-divider></v-divider>
                    <template v-if="chats.length > 0">
                      <v-list-item
                        v-for="chatItem in chats"
                        :key="chatItem.id"
                        link
                        @click="onChatSelect(chatItem.id)"
                        class="chat-list-item-main"
                      >
                        <template v-slot:prepend>
                          <v-icon :icon="chatItem.type === 'ProblemSolver' ? 'mdi-function' : 'mdi-chat'" class="mr-2"></v-icon>
                        </template>
                        <v-list-item-title>{{ chatItem.name }}</v-list-item-title>
                        <template v-slot:append>
                          <v-icon size="small">mdi-chevron-right</v-icon>
                        </template>
                      </v-list-item>
                    </template>
                    <v-list-item v-else>
                      <v-list-item-title class="text-center py-4 text-medium-emphasis">
                        У вас пока нет чатов
                      </v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-card>

                <v-btn
                  color="primary"
                  size="large"
                  prepend-icon="mdi-plus"
                  @click="createNewChat"
                >
                  Создать новый чат
                </v-btn>
              </v-col>
            </v-row>
          </v-container>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import MessageItem from '../MessageItem.vue'
import { useChatView } from '@/composables/useChatView'

defineOptions({
  name: 'ChatMessages'
})

const emit = defineEmits(['chatSelected', 'chatDeleted', 'update:chatId'])

const props = defineProps({
  chatId: String,
})

const {
  chatId,
  messagesCard,
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
  onChatSelect,
  onChatDelete,
  createNewChat,
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

.no-chat-selected {
  height: 100%;
  overflow-y: auto;
}

.chat-list-card {
  border-radius: 1rem !important;
  background-color: rgba(var(--v-theme-surface), 0.5) !important;
  max-height: 400px;
  overflow-y: auto;
}

.chat-list-item-main {
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.05);
}

.chat-list-item-main:last-child {
  border-bottom: none;
}

.chat-sidebar {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.sidebar-header {
  padding: 1rem;
  border-bottom: 1px solid rgba(var(--v-theme-primary), 0.1);
}

.new-chat-button {
  text-transform: none;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.chat-list {
  flex-grow: 1;
  overflow-y: auto;
  overflow-x: hidden;
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

/* Стили для правильного отображения матриц KaTeX */
:deep(.katex) {
  display: inline-block;
}

:deep(.katex .base) {
  display: inline-block;
}
</style>
