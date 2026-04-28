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
            <div v-for="(msg, idx) in messages" :key="idx">
              <strong>{{ msg.user }}:</strong> {{ msg.text }}
            </div>
          </div>
          <input v-model="newMessage" @keyup.enter="sendMessage" placeholder="输入消息..." />
          <button @click="sendMessage">发送</button>
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

const route = useRoute()
const userStore = useUserStore()
const roomId = route.params.roomId as string

// 画板引用
const canvasRef = ref<InstanceType<typeof TempCanvas> | null>(null)

// 工具栏状态
const color = ref('#000000')
const lineWidth = ref(2)

// 聊天
const messages = ref<{ user: string; text: string }[]>([])
const newMessage = ref('')
const chatContainer = ref<HTMLElement>()

// 在线成员（示例，实际应该通过 WebSocket 更新）
const members = ref([
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
])

// 工具栏方法
const handleColorChange = () => {
  canvasRef.value?.setColor(color.value)
}
const handleWidthChange = () => {
  canvasRef.value?.setLineWidth(parseInt(lineWidth.value as any))
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

// 本地绘制时，通过 WebSocket 广播绘图数据
const onLocalDraw = (drawData: any) => {
  wsService.send('draw', drawData)
}

// 发送聊天消息
const sendMessage = () => {
  if (newMessage.value.trim()) {
    wsService.send('chat', { message: newMessage.value })
    // 本地立即显示（避免等待服务器回显，若服务器会广播则会导致重复，可根据需要调整）
    messages.value.push({
      user: userStore.user?.username || '我',
      text: newMessage.value,
    })
    newMessage.value = ''
    scrollChatToBottom()
  }
}

// 滚动聊天到底部
const scrollChatToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

// 接收聊天消息的处理
const handleChatMessage = (data: any) => {
  // data 结构: { username: string, message: string }
  messages.value.push({
    user: data.username,
    text: data.message,
  })
  scrollChatToBottom()
}

// 接收绘图消息（待角色C提供远程绘制接口）
const handleDrawMessage = (data: any) => {
  console.log('收到远端绘图数据', data)
  // TODO: 调用画板组件的远程绘制方法，例如 canvasRef.value?.drawRemote(data)
}

// WebSocket 连接与事件注册
onMounted(() => {
  const userId = userStore.user?.id
  const token = userStore.token
  if (userId && token) {
    // 连接后端 WebSocket（角色A需提供实际地址）
    // 如果后端未就绪，可以暂时注释，或者使用测试地址
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
.board {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 10px;
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
}
.canvas-container {
  flex: 3;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: auto;
}
.sidebar {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.chat,
.members {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 10px;
  background: #fafafa;
}
.messages {
  height: 300px;
  overflow-y: auto;
  border: 1px solid #eee;
  margin-bottom: 10px;
  padding: 5px;
}
.chat input {
  width: calc(100% - 60px);
  margin-right: 5px;
}
.members ul {
  list-style: none;
  padding: 0;
}
</style>
