// src/services/websocket.ts
type MessageHandler = (data: unknown) => void

interface WsConfig {
  url: string
  roomId: string
  userId: number
  token: string
}

interface SendMessage {
  type: string
  data: unknown
  roomId: string
  userId: number
}

class WebSocketService {
  private ws: WebSocket | null = null
  private config: WsConfig | null = null
  private handlers: Map<string, MessageHandler[]> = new Map()
  private heartbeatInterval: number | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 1000
  private reconnectTimer: number | null = null

  connect(roomId: string, userId: number, token: string, wsUrl?: string) {
    const url = wsUrl || `ws://localhost:8080/ws?roomId=${roomId}&userId=${userId}&token=${token}`
    this.config = { url, roomId, userId, token }
    this.doConnect()
  }

  private doConnect() {
    if (!this.config) return
    this.ws = new WebSocket(this.config.url)
    this.ws.onopen = () => {
      console.log('WebSocket 连接成功')
      this.reconnectAttempts = 0
      this.reconnectDelay = 1000
      this.startHeartbeat()
    }
    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as { type: string; data: unknown }
        const { type, data } = message
        if (this.handlers.has(type)) {
          this.handlers.get(type)!.forEach((handler) => handler(data))
        }
      } catch (err) {
        console.error('解析消息出错', err)
      }
    }
    this.ws.onclose = () => {
      console.log('WebSocket 断开')
      this.stopHeartbeat()
      this.scheduleReconnect()
    }
    this.ws.onerror = (err) => {
      console.error('WebSocket 错误', err)
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('达到最大重连次数，放弃重连')
      return
    }
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = window.setTimeout(() => {
      console.log(`尝试重连 (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})...`)
      this.reconnectAttempts++
      this.doConnect()
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000)
    }, this.reconnectDelay)
  }

  private startHeartbeat() {
    this.heartbeatInterval = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000)
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval)
  }

  send(type: string, data: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN && this.config) {
      const message: SendMessage = {
        type,
        data,
        roomId: this.config.roomId,
        userId: this.config.userId,
      }
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket 未连接，消息未发送')
    }
  }

  on(type: string, handler: MessageHandler) {
    if (!this.handlers.has(type)) this.handlers.set(type, [])
    this.handlers.get(type)!.push(handler)
  }

  off(type: string, handler: MessageHandler) {
    if (!this.handlers.has(type)) return
    const idx = this.handlers.get(type)!.indexOf(handler)
    if (idx !== -1) this.handlers.get(type)!.splice(idx, 1)
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
    this.ws = null
    this.config = null
    this.reconnectAttempts = 0
  }
}

export default new WebSocketService()
