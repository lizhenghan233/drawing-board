<template>
  <div class="board">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <label>颜色：</label>
      <input type="color" v-model="color" @change="handleColorChange" />
      <label>线宽：</label>
      <input type="range" v-model="lineWidth" min="1" max="20" @input="handleWidthChange" />
      <button @click="handleClear">清屏</button>
      <button @click="handleUndo">撤销</button>
      <button @click="handleRedo">重做</button>
    </div>

    <!-- 主体区域 -->
    <div class="main-area">
      <div class="canvas-container">
        <TempCanvas ref="canvasRef" :width="800" :height="500" @draw="onLocalDraw" />
      </div>
      <div class="sidebar">
        <div class="chat">
          <h4>聊天</h4>
          <div class="messages" ref="chatContainer">
            <div v-for="(msg, idx) in messages" :key="idx" class="message-item">
              <strong>{{ msg.user }}:</strong> {{ msg.text }}
              <span class="time">{{ msg.time }}</span>
            </div>
          </div>
          <div class="chat-input-area">
            <input
              v-model="newMessage"
              @keyup.enter="sendMessage"
              placeholder="输入消息，回车发送"
            />
            <button @click="sendMessage">发送</button>
          </div>
        </div>
        <div class="members">
          <h4>在线成员</h4>
          <ul>
            <li v-for="member in members" :key="member.id">{{ member.name }}</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import TempCanvas from '@/components/TempCanvas.vue'
import wsService from '@/services/websocket'

// ---------- 类型定义 ----------
interface DrawingData {
  color: string
  lineWidth: number
  points?: number[][]
  message?: string
}

interface ChatMessage {
  user: string
  text: string
  time: string
}

interface ChatData {
  username: string
  message: string
}

interface Member {
  id: number
  name: string
}
// -----------------------------

const route = useRoute()
const userStore = useUserStore()
const roomId = route.params.roomId as string

const canvasRef = ref<InstanceType<typeof TempCanvas> | null>(null)
const color = ref('#000000')
const lineWidth = ref(2)

// 聊天
const messages = ref<ChatMessage[]>([])
const newMessage = ref('')
const chatContainer = ref<HTMLElement>()

// 在线成员（示例）
const members = ref<Member[]>([
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
])

// 工具栏方法
const handleColorChange = () => {
  canvasRef.value?.setColor(color.value)
}
const handleWidthChange = () => {
  canvasRef.value?.setLineWidth(lineWidth.value)
}
const handleClear = () => {
  canvasRef.value?.clearCanvas()
}
const handleUndo = () => {
  canvasRef.value?.undo()
}
const handleRedo = () => {
  canvasRef.value?.redo()
}

// 本地绘图广播
const onLocalDraw = (drawData: DrawingData) => {
  wsService.send('draw', drawData)
}

// 获取当前时间
const getCurrentTime = () => {
  const now = new Date()
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// 滚动聊天到底部
const scrollChatToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

// 发送消息
const sendMessage = () => {
  const text = newMessage.value.trim()
  if (!text) return

  const time = getCurrentTime()
  messages.value.push({
    user: userStore.user?.username || '我',
    text,
    time,
  })
  scrollChatToBottom()
  wsService.send('chat', { message: text })
  newMessage.value = ''
}

// 接收聊天消息（参数为 unknown，内部断言为 ChatData）
const handleChatMessage = (data: unknown) => {
  const chatData = data as ChatData
  const time = getCurrentTime()
  messages.value.push({
    user: chatData.username,
    text: chatData.message,
    time,
  })
  scrollChatToBottom()
}

// 接收绘图消息（参数为 unknown，内部断言为 DrawingData）
const handleDrawMessage = (data: unknown) => {
  const drawData = data as DrawingData & { userId?: number }
  console.log('收到远端绘图数据', drawData)
  // TODO: canvasRef.value?.drawRemote(drawData)
}

// WebSocket 连接
onMounted(() => {
  const userId = userStore.user?.id
  const token = userStore.token
  if (userId && token) {
    wsService.connect(roomId, Number(userId), token)
    wsService.on('chat', handleChatMessage)
    wsService.on('draw', handleDrawMessage)
  } else {
    console.warn('用户未登录，无法连接 WebSocket')
  }
})

onUnmounted(() => {
  wsService.off('chat', handleChatMessage)
  wsService.off('draw', handleDrawMessage)
  wsService.disconnect()
})
</script>

<style scoped>
/* 样式保持不变，与之前一致 */
.board {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 10px;
  box-sizing: border-box;
}
.toolbar {
  display: flex;
  gap: 15px;
  align-items: center;
  background: #f0f0f0;
  padding: 8px 16px;
  border-radius: 8px;
  margin-bottom: 10px;
}
.main-area {
  display: flex;
  flex: 1;
  gap: 20px;
  min-height: 0;
}
.canvas-container {
  flex: 3;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sidebar {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 200px;
}
.chat,
.members {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 10px;
  background: #fafafa;
  display: flex;
  flex-direction: column;
}
.chat {
  flex: 2;
}
.members {
  flex: 1;
}
.messages {
  flex: 1;
  overflow-y: auto;
  border: 1px solid #eee;
  margin-bottom: 10px;
  padding: 5px;
  min-height: 200px;
  max-height: 300px;
}
.message-item {
  margin-bottom: 6px;
  word-break: break-word;
}
.time {
  font-size: 11px;
  color: #888;
  margin-left: 8px;
}
.chat-input-area {
  display: flex;
  gap: 5px;
}
.chat-input-area input {
  flex: 1;
  padding: 5px;
}
.chat-input-area button {
  padding: 5px 12px;
}
.members ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.members li {
  padding: 4px 0;
}
</style>
