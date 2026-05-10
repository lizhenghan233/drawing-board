// src/composables/use-chat.ts
import { ref, nextTick } from 'vue'
import type { ChatMessage } from '@/types'

export function useChat() {
  const messages = ref<ChatMessage[]>([])
  const newMessage = ref('')
  const chatContainer = ref<HTMLElement>()

  const getCurrentTime = () => {
    const now = new Date()
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const scrollToBottom = () => {
    nextTick(() => {
      if (chatContainer.value) {
        chatContainer.value.scrollTop = chatContainer.value.scrollHeight
      }
    })
  }

  const addMessage = (username: string, text: string) => {
    const time = getCurrentTime()
    messages.value.push({ user: username, text, time })
    scrollToBottom()
  }

  // sendMessage 接收当前用户名和可选的发送回调
  const sendMessage = (currentUsername: string, sendCallback?: (text: string) => void) => {
    const text = newMessage.value.trim()
    if (!text) return
    addMessage(currentUsername, text)
    if (sendCallback) sendCallback(text)
    newMessage.value = ''
  }

  return {
    messages,
    newMessage,
    chatContainer,
    addMessage,
    sendMessage,
    scrollToBottom,
  }
}
