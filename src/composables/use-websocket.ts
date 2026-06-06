// src/composables/use-websocket.ts
import { ref } from 'vue'
import wsService from '@/services/websocket'

export function useWebSocket() {
  const isConnected = ref(false)

  const connect = (
    roomId: string,
    userId: number,
    token: string,
    username: string,
    wsUrl?: string,
  ) => {
    wsService.connect(roomId, userId, token, username, wsUrl)
    // 简单检测连接状态（可选）
    const interval = setInterval(() => {
      if (wsService.isConnected()) {
        isConnected.value = true
        clearInterval(interval)
      }
    }, 500)
  }

  const send = (type: string, data: unknown) => {
    wsService.send(type, data)
  }

  const sendText = (text: string) => {
    wsService.sendText(text)
  }

  const on = (type: string, handler: (data: unknown) => void) => {
    wsService.on(type, handler)
  }

  const off = (type: string, handler: (data: unknown) => void) => {
    wsService.off(type, handler)
  }

  const disconnect = () => {
    wsService.disconnect()
    isConnected.value = false
  }

  return {
    isConnected,
    connect,
    send,
    sendText,
    on,
    off,
    disconnect,
  }
}
