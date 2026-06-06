// src/services/websocket.ts
type MessageHandler = (data: unknown) => void

interface WsConfig {
  url: string
  roomId: string
  userId: number
  token: string
}

interface PendingMessage {
  type: string
  data: unknown
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
  private pendingMessages: PendingMessage[] = []

  connect(roomId: string, userId: number, token: string, username: string, wsUrl?: string) {
    const baseUrl = wsUrl || import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws'
    const url = `${baseUrl}?roomId=${roomId}&userId=${userId}&token=${token}&username=${encodeURIComponent(username)}`
    this.config = { url, roomId, userId, token }
    this.doConnect()
  }

  private doConnect() {
    if (!this.config) return
    this.ws = new WebSocket(this.config.url)

    this.ws.onopen = () => {
      console.log('WebSocket 连接成功')
      const joinMsg = `JOIN:${this.config!.roomId}`
      this.ws!.send(joinMsg)
      console.log('发送 JOIN 消息:', joinMsg)

      this.reconnectAttempts = 0
      this.reconnectDelay = 1000
      this.startHeartbeat()
      this.flushPendingMessages()
    }

    this.ws.onmessage = (event) => {
      const rawData = event.data
      console.log('收到原始消息:', rawData) // 调试日志
      try {
        // 尝试解析为 JSON
        const message = JSON.parse(rawData)
        const { type, data } = message
        if (this.handlers.has(type)) {
          this.handlers.get(type)!.forEach((handler) => handler(data))
        }
      } catch {
        // 不是 JSON，尝试解析纯文本消息
        if (typeof rawData === 'string') {
          // 处理 CHAT:username:message
          if (rawData.startsWith('CHAT:')) {
            const parts = rawData.split(':')
            if (parts.length >= 3) {
              const username = parts[1]
              const message = parts.slice(2).join(':')
              if (this.handlers.has('chat')) {
                this.handlers.get('chat')!.forEach((handler) => handler({ username, message }))
              }
            } else {
              console.warn('收到无效的 CHAT 消息格式:', rawData)
            }
          }
          // 处理 MEMBERS:匿名 或 MEMBERS:user1,user2,user3
          else if (rawData.startsWith('MEMBERS:')) {
            const membersStr = rawData.substring('MEMBERS:'.length)
            let membersList: { id: number; name: string }[] = []
            if (membersStr.includes(',')) {
              const usernames = membersStr.split(',').filter((s) => s.trim().length > 0)
              membersList = usernames.map((name, idx) => ({ id: idx, name: name.trim() }))
            } else if (membersStr.length > 0) {
              membersList = [{ id: 0, name: membersStr }]
            }
            const membersData = { members: membersList }
            if (this.handlers.has('members')) {
              this.handlers.get('members')!.forEach((handler) => handler(membersData))
            }
          } else {
            console.warn('收到非 JSON 且非 CHAT/MEMBERS 格式的消息:', rawData)
          }
        }
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

  send(type: string, data: unknown) {
    if (this.isConnected()) {
      this.doSend(type, data)
    } else {
      console.warn('WebSocket 未连接，消息已缓存', { type, data })
      this.pendingMessages.push({ type, data })
    }
  }

  sendText(text: string) {
    if (this.isConnected()) {
      this.ws!.send(text)
    } else {
      console.warn('WebSocket 未连接，文本消息未发送:', text)
    }
  }

  private doSend(type: string, data: unknown) {
    if (!this.config || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.pendingMessages.push({ type, data })
      return
    }
    const message = { type, data, roomId: this.config.roomId, userId: this.config.userId }
    this.ws.send(JSON.stringify(message))
  }

  private flushPendingMessages() {
    if (this.pendingMessages.length === 0) return
    console.log(`正在发送 ${this.pendingMessages.length} 条缓存消息...`)
    const messagesToSend = [...this.pendingMessages]
    this.pendingMessages = []
    for (const msg of messagesToSend) {
      this.doSend(msg.type, msg.data)
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN && this.config !== null
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
    this.pendingMessages = []
    this.stopHeartbeat()
  }

  private startHeartbeat() {
    this.heartbeatInterval = window.setInterval(() => {
      if (this.isConnected()) {
        this.ws!.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000)
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
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
}

export default new WebSocketService()
