import axios, { type AxiosInstance } from 'axios'
import type { Chat } from '@/models/Chat'
import type { Message } from '@/models/Message'
import type { ChatDto, CreateChatDto, MessageDto, SendMessageRequestDto, ProblemsResponseDto } from '@/types/BackendDtos'
import { Stream } from 'stream'

const baseUrl = import.meta.env.VITE_MATHLLM_BACKEND_ADDRESS

export function useChat() {
  const client: AxiosInstance = axios.create({
    baseURL: baseUrl,
  })

  async function createChat(dto: CreateChatDto): Promise<string> {
    console.log(dto)
    const res = await client.post('/api/chat/create', dto, { withCredentials: true })
    return res.data.id
  }

  async function deleteChat(id: string): Promise<void> {
    try {
      await client.post(`/api/chat/delete/${id}`, {}, { withCredentials: true })
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return
      }
      console.error('Failed to delete chat:', error)
      throw new Error('Failed to delete chat. Please try again.')
    }
  }

  async function getChats(): Promise<Chat[]> {
    const resp = await client.get<ChatDto[]>('/api/chat/get', { withCredentials: true })
    return resp.data.map((c) => ({ id: c.id, name: c.name, type: c.type }) as Chat)
  }

  async function getChatById(id: string): Promise<Chat | undefined> {
    const resp = await client.get<ChatDto[]>('/api/chat/get', { withCredentials: true })
    return resp.data.map((c) => ({ id: c.id, name: c.name, type: c.type }) as Chat).find((c) => c.id === id)
  }

  async function getNextMessage(text: string, chatId: string): Promise<Stream<string>> {
    const dto: SendMessageRequestDto = { chatId, text }
    const resp = await client.post<Stream<string>>('/api/Message/complete', dto, {
      withCredentials: true,
      headers: {
        responseType: 'stream',
      },
    })
    return resp.data
  }

  async function getChatMessages(chatId: string): Promise<Message[]> {
    const resp = await client.get<MessageDto[]>(
      `/api/Message/get-messages-from-chat?chatId=${chatId}`,
      { withCredentials: true },
    )
    return resp.data.map(
      (m) =>
        ({
          id: m.id,
          time: m.creationTime,
          text: m.text,
          type: m.type === 'Assistant' ? 'bot' : 'user',
        }) as Message,
    )
  }

  async function getProblems(page: number, prefix?: string): Promise<ProblemsResponseDto> {
    const params = new URLSearchParams({
      page: page.toString(),
      size: '10'
    });
    if (prefix) {
      params.append('prefix', prefix);
    }
    const resp = await client.get<ProblemsResponseDto>(`/api/Tasks/problems?${params.toString()}`, { withCredentials: true });
    return resp.data;
  }

  return {
    createChat,
    deleteChat,
    getChats,
    getChatById,
    getNextMessage,
    getChatMessages,
    getProblems,
  }
}
