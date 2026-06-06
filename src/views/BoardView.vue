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
      <label>工具：</label>
      <button @click="setTool('pen')">画笔</button>
      <button @click="setTool('rect')">矩形</button>
      <button @click="setTool('circle')">圆形</button>
      <button @click="setTool('text')">文本</button>
      <!-- 新增退出按钮 -->
      <button @click="handleLogout" class="logout-btn">退出登录</button>
    </div>

    <div class="main-area">
      <div class="canvas-container">
        <DrawingCanvas ref="canvasRef" :userId="userId" @draw="onLocalDraw" />
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
              @keyup.enter="handleSend"
              placeholder="输入消息，回车发送"
            />
            <button @click="handleSend">发送</button>
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
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router' // 添加 useRouter
import { useUserStore } from '@/stores/userStore'
import DrawingCanvas from '@/components/DrawingCanvas.vue'
import { useWebSocket } from '@/composables/use-websocket'
import { useChat } from '@/composables/use-chat'
import type { DrawAction } from '@/types'

const route = useRoute()
const router = useRouter() // 新增
const userStore = useUserStore()
const roomId = route.params.roomId as string
const userId = userStore.user?.id ? Number(userStore.user.id) : 0
const token = userStore.token

const canvasRef = ref<InstanceType<typeof DrawingCanvas> | null>(null)
const color = ref('#000000')
const lineWidth = ref(2)

const handleColorChange = () => canvasRef.value?.setColor(color.value)
const handleWidthChange = () => canvasRef.value?.setLineWidth(lineWidth.value)
const handleClear = () => canvasRef.value?.clearCanvas()
const handleUndo = () => canvasRef.value?.undo()
const handleRedo = () => canvasRef.value?.redo()
const setTool = (tool: 'pen' | 'rect' | 'circle' | 'text') => {
  canvasRef.value?.setTool(tool)
}

const onLocalDraw = (drawData: DrawAction) => {
  ws.send('draw', drawData)
}

const ws = useWebSocket()
const { messages, newMessage, chatContainer, addMessage, sendMessage } = useChat()

const sendChatMessage = (text: string) => {
  const username = userStore.user?.username || '匿名用户'
  ws.sendText(`CHAT:${username}:${text}`)
}

const handleSend = () => {
  const currentUsername = userStore.user?.username || '匿名用户'
  sendMessage(currentUsername, sendChatMessage)
}

const handleChatMessage = (data: unknown) => {
  const { username, message } = data as { username: string; message: string }
  if (username === userStore.user?.username) return
  addMessage(username, message)
}

const handleDrawMessage = (data: unknown) => {
  const drawData = data as DrawAction
  if (drawData.userId !== userId) {
    canvasRef.value?.drawRemote(drawData)
  }
}

// 在线成员（动态）
const members = ref<{ id: number; name: string }[]>([])

const handleMembersUpdate = (data: unknown) => {
  const { members: memberList } = data as { members: { id: number; name: string }[] }
  members.value = memberList.map((m) => ({ id: m.id, name: m.name }))
}
// 新增退出登录方法
const handleLogout = async () => {
  ws.disconnect() // 主动关闭 WebSocket
  await userStore.logout()
  router.push('/login')
}

onMounted(() => {
  if (userId && token) {
    const username = userStore.user?.username || '匿名用户'
    console.log(
      '准备连接 WebSocket, roomId:',
      roomId,
      'userId:',
      userId,
      'token:',
      token,
      'username:',
      username,
    )
    ws.connect(roomId, userId, token, username)
    ws.on('chat', handleChatMessage)
    ws.on('draw', handleDrawMessage)
    ws.on('members', handleMembersUpdate)
  } else {
    console.warn('用户未登录，无法连接 WebSocket')
  }
})

onUnmounted(() => {
  ws.off('chat', handleChatMessage)
  ws.off('draw', handleDrawMessage)
  ws.off('members', handleMembersUpdate)
  ws.disconnect()
})
</script>

<style scoped>
/* 原有所有样式保持不变，仅新增下面几行 */
.logout-btn {
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 20px;
  padding: 6px 16px;
  cursor: pointer;
  margin-left: auto;
}
.logout-btn:hover {
  background: #c82333;
}

/* 以下是你原有的样式（请确保它们还在，这里仅示意） */
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
