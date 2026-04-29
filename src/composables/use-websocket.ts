// src/composables/use-websocket.ts
import { ref } from 'vue'
import wsService from '@/services/websocket'

export function useWebSocket() {
  const isConnected = ref(false)

  const connect = (roomId: string, userId: number, token: string, wsUrl?: string) => {
    wsService.connect(roomId, userId, token, wsUrl)
  }

  const send = (type: string, data: unknown) => {
    wsService.send(type, data)
  }

  const on = (type: string, handler: (data: unknown) => void) => {
    wsService.on(type, handler)
  }

  const off = (type: string, handler: (data: unknown) => void) => {
    wsService.off(type, handler)
  }

  const disconnect = () => {
    wsService.disconnect()
  }

  return {
    isConnected,
    connect,
    send,
    on,
    off,
    disconnect,
  }
}
