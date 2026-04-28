type MessageHandler = (data: any) => void

class WebSocketService {
  private ws: WebSocket | null = null
  private roomId: string | null = null
  private userId: number | null = null
  private handlers: Map<string, MessageHandler[]> = new Map()
  private heartbeatInterval: number | null = null

  connect(roomId: string, userId: number, token: string, wsUrl?: string) {
    // 默认后端地址，需要与角色 A 协商，这里留作配置
    const url = wsUrl || `ws://localhost:8080/ws?roomId=${roomId}&userId=${userId}&token=${token}`
    this.ws = new WebSocket(url)
    this.roomId = roomId
    this.userId = userId

    this.ws.onopen = () => {
      console.log('WebSocket 连接成功')
      this.startHeartbeat()
    }

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
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
    }

    this.ws.onerror = (err) => {
      console.error('WebSocket 错误', err)
    }
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

  send(type: string, data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data, roomId: this.roomId, userId: this.userId }))
    } else {
      console.warn('WebSocket 未连接')
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
    this.ws?.close()
    this.ws = null
  }
}

export default new WebSocketService()
