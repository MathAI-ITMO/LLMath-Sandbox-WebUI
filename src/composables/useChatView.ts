import { ref, watch, onMounted, computed, nextTick } from 'vue'
import type { Chat } from '@/models/Chat'
import type { Message } from '@/models/Message'
import { useChat } from '@/composables/useChat'
import { useRouter, useRoute } from 'vue-router'
import type { ProblemDto, CreateChatDto } from '@/types/BackendDtos'
import { useUserTasks } from '@/composables/useUserTasks'
import { UserTaskStatus } from '@/types/BackendDtos'

export function useChatView(props: { chatId?: string }, emit: any) {
  const route = useRoute()
  const router = useRouter()

  const { getChatById, getChatMessages, getNextMessage, createChat, getChats, deleteChat, getProblems } = useChat()
  const { completeUserTask, fetchUserTasks } = useUserTasks()

  const chatId = ref<string | undefined>(props.chatId)

  const messagesCard = ref<HTMLElement | null>(null)
  const chatName = ref<string>('')
  const chatMode = ref<string>('chat')
  const selectedProblem = ref<string>('')
  const selectedProblemHash = ref<string>('')
  const searchQuery = ref<string>('')
  const problems = ref<ProblemDto[]>([])
  const totalProblems = ref<number>(0)
  const page = ref<number>(1)
  const itemsPerPage = 10
  const isLoading = ref<boolean>(false)
  const isCreatingChat = ref<boolean>(false)
  const hasDuplicateName = ref<boolean>(false)
  const needsConfirmation = ref<boolean>(false)

  const pageCount = computed(() => {
    return Math.ceil(totalProblems.value / itemsPerPage)
  })

  const isCreateDisabled = computed(() => {
    if (!chatName.value || (chatMode.value === 'problem-solving' && !selectedProblem.value) || isCreatingChat.value) {
      return true
    }
    if (hasDuplicateName.value && !needsConfirmation.value) {
      return false
    }
    return false
  })

  const sidebarOpen = ref<boolean>(false)
  const chats = ref<Chat[]>([])

  const chat = ref<Chat>()
  const messages = ref<Message[]>([])
  const currentMessageText = ref<string>('')
  const isSending = ref<boolean>(false)

  const userTaskId = ref<number | null>(null)
  const taskStatus = ref<UserTaskStatus | null>(null)
  const taskType = ref<number | null>(null)
  const markingSolved = ref(false)

  function scrollToBottom() {
    nextTick(() => {
      if (messagesCard.value) {
        try {
          messagesCard.value.scrollTop = messagesCard.value.scrollHeight;
        } catch (error) {
          console.warn('Error scrolling to bottom:', error);
        }
      }
    });
  }

  async function onChatUpdate() {
    chats.value = await getChats();

    if (!chatId.value) {
      chat.value = undefined;
      messages.value = [];
      return;
    }

    const receivedChat = await getChatById(chatId.value);
    chat.value = receivedChat;
    const receivedMessages = await getChatMessages(chatId.value);

    messages.value = receivedMessages;

    console.log('Loaded', receivedMessages?.length || 0, 'messages for chat', chatId.value);
    scrollToBottom();
  }

  async function sendMessage() {
    if (!chatId?.value)
    {
      console.log('send message called but chat id not specified yet')
      return;
    }

    if (!currentMessageText.value)
    {
      // Using a more user-friendly way for errors in real apps is better than alert
      console.warn('Message cannot be sent because it is empty')
      return;
    }
    isSending.value = true

    const userMessage : Message = {
      id: `temp-user-${Date.now()}-${Math.random()}`,
      chatId: chatId!.value,
      type: 'user',
      text: currentMessageText.value,
      time: new Date()
    }

    messages.value.push(userMessage)
    scrollToBottom()

    const messageText = currentMessageText.value
    currentMessageText.value = ""

    try {
      const botResponseText = await getNextMessage(messageText, chatId!.value)

      const message : Message = {
        id: `temp-bot-${Date.now()}-${Math.random()}`,
        chatId: chatId!.value,
        type: 'bot',
        text: botResponseText,
        time: new Date()
      }

      messages.value.push(message)
      scrollToBottom()
    } catch (error) {
      console.error('Error sending message:', error);
      // alert('Ошибка при отправке сообщения. Попробуйте снова.');
    } finally {
      isSending.value = false
    }
  }

  async function onChatCreate() {
    try {
      if (hasDuplicateName.value && !needsConfirmation.value) {
        needsConfirmation.value = true
        return
      }

      isCreatingChat.value = true
      const dto: CreateChatDto = {
        name: chatName.value,
        problemHash: chatMode.value === 'problem-solving' ? selectedProblemHash.value : undefined,
        type: chatMode.value === 'problem-solving' ? 'ProblemSolver' : 'Chat'
      }
      const id = await createChat(dto)
      emit('chatSelected', id)
      sidebarOpen.value = false

      await onChatUpdate()
    } finally {
      isCreatingChat.value = false
    }
  }

  async function onChatSelect(id: string) {
    console.log('chat with id ' + id + ' selected')
    emit('chatSelected', id)
    sidebarOpen.value = false
    chatId.value = id;
    await onChatUpdate();
  }

  async function onChatDelete(id: string) {
    try {
      await deleteChat(id)
      if (id === chatId.value) {
        chatName.value = ''
        chat.value = undefined
        messages.value = []
        chatId.value = undefined
        emit('chatDeleted')
        router.push('/chat')
      }
      await onChatUpdate()
    } catch (error) {
      console.error('Error deleting chat:', error)
    }
  }

  function createNewChat() {
    chatName.value = ''
    chat.value = undefined
    messages.value = []
    emit('update:chatId', undefined)
    router.push('/chat')
    sidebarOpen.value = false
  }

  async function onSearch() {
    page.value = 1
    await fetchProblems()
  }

  async function fetchProblems() {
    try {
      isLoading.value = true
      const response = await getProblems(page.value, searchQuery.value)
      problems.value = response.problems
      totalProblems.value = response.number
    } catch (error) {
      console.error('Error fetching problems:', error)
    } finally {
      isLoading.value = false
    }
  }

  async function updateTaskInfo() {
    if (!chatId.value) {
      userTaskId.value = null;
      taskStatus.value = null;
      taskType.value = null;
      return;
    }
    // Загружаем задачи пользователя (все типы)
    try {
      // Сначала проверяем тип 0
      const tasks0 = await fetchUserTasks(0);
      let task = tasks0.find(t => t.associatedChatId === chatId.value);

      // Если не нашли в типе 0, проверяем типы 1-3
      if (!task) {
        for (let i = 1; i <= 3; i++) {
          const tasksI = await fetchUserTasks(i);
          task = tasksI.find(t => t.associatedChatId === chatId.value);
          if (task) {
            taskType.value = i;
            break;
          }
        }
      } else {
        taskType.value = 0;
      }

      if (task) {
        userTaskId.value = task.id as unknown as number; // id is number
        taskStatus.value = task.status;
      } else {
        // Это обычный чат, не связанный с задачей
        userTaskId.value = null;
        taskStatus.value = null;
        taskType.value = null;
      }
    } catch (err) {
      console.error('Failed to fetch user tasks for chat view:', err);
    }
  }

  async function markTaskSolved() {
    if (!userTaskId.value) return;
    markingSolved.value = true;
    try {
      const res = await completeUserTask(userTaskId.value);
      if (res) {
        taskStatus.value = UserTaskStatus.Solved;
        // Переходим к списку задач с правильным типом
        if (taskType.value !== null) {
          router.push(`/select-task?taskType=${taskType.value}`);
        } else {
          router.push('/select-task');
        }
      }
    } catch (error) {
      console.error('Error marking task as solved:', error);
    } finally {
      markingSolved.value = false;
    }
  }

  onMounted(async () => {
    chatId.value = route.params.chatId as string | undefined;
    emit('update:chatId', chatId.value);
    await onChatUpdate();
    await fetchProblems();
    await updateTaskInfo();
  })

  watch(() => route.params.chatId, async (newChatId) => {
    console.log('New chatId from URL:', newChatId);
    chatId.value = newChatId as string | undefined;
    emit('update:chatId', chatId.value);
    await onChatUpdate();
  })

  watch(page, async () => {
    await fetchProblems()
  })

  watch(chatName, () => {
    hasDuplicateName.value = chats.value.some(chatItem => chatItem.name === chatName.value)
    needsConfirmation.value = false
  })

  watch(chatId, () => {
    updateTaskInfo();
  });

  return {
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
    scrollToBottom,
    onChatUpdate,
    sendMessage,
    onChatCreate,
    onChatSelect,
    onChatDelete,
    createNewChat,
    onSearch,
    fetchProblems,
    updateTaskInfo,
    markTaskSolved,
    UserTaskStatus
  }
}
