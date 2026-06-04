<template>
  <div class="rooms-container">
    <div class="overlay"></div>
    <div class="rooms-content">
      <h2>📁 房间列表</h2>
      <div class="create-room">
        <input v-model="newRoomName" placeholder="新房间名称" :disabled="loading" />
        <button @click="handleCreateRoom" :disabled="loading">
          {{ loading ? '创建中...' : '+ 创建房间' }}
        </button>
      </div>
      <ul class="room-list">
        <li v-for="room in roomStore.rooms" :key="room.id" class="room-card">
          <span class="room-name">{{ room.name }}</span>
          <button @click="joinRoom(room.id)">加入</button>
        </li>
      </ul>
      <p v-if="roomStore.rooms.length === 0" class="empty-tip">暂无房间，请创建一个~</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRoomStore } from '@/stores/roomStore'
import { useUserStore } from '@/stores/userStore'
import { showToast } from '@/composables/use-toast'

const newRoomName = ref('')
const loading = ref(false)
const router = useRouter()
const roomStore = useRoomStore()
const userStore = useUserStore()

onMounted(async () => {
  try {
    await roomStore.fetchRooms()
  } catch {
    showToast('加载房间列表失败', 'error')
  }
})

async function handleCreateRoom() {
  if (!newRoomName.value.trim()) {
    showToast('请输入房间名称', 'error')
    return
  }
  const userId = userStore.user?.id
  if (!userId) {
    showToast('未登录，请重新登录', 'error')
    router.push('/login')
    return
  }
  loading.value = true
  try {
    const createdBy = typeof userId === 'string' ? parseInt(userId) : userId
    await roomStore.addRoom(newRoomName.value, createdBy)
    newRoomName.value = ''
    showToast('房间创建成功', 'success')
  } catch {
    showToast('创建房间失败', 'error')
  } finally {
    loading.value = false
  }
}

function joinRoom(roomId: number) {
  router.push(`/board/${roomId}`)
}
</script>

<style scoped>
.rooms-container {
  position: relative;
  min-height: 100vh;
  background-image: url('https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop');
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  z-index: 1;
}

.rooms-content {
  position: relative;
  z-index: 2;
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;
}

h2 {
  color: white;
  font-size: 2rem;
  text-align: center;
  margin-bottom: 30px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.create-room {
  display: flex;
  gap: 12px;
  margin-bottom: 32px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(4px);
  padding: 20px;
  border-radius: 60px;
}

.create-room input {
  flex: 1;
  padding: 12px 20px;
  border-radius: 40px;
  border: none;
  font-size: 16px;
  background: white;
}

.create-room button {
  padding: 12px 24px;
  border-radius: 40px;
  border: none;
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  color: #1e2a3a;
  font-weight: bold;
  cursor: pointer;
  transition: 0.2s;
}

.create-room button:hover:not(:disabled) {
  transform: scale(1.02);
  opacity: 0.9;
}

.room-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.room-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(4px);
  border-radius: 60px;
  padding: 12px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;
}

.room-card:hover {
  transform: translateX(8px);
  background: white;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}

.room-name {
  font-size: 1.2rem;
  font-weight: 500;
  color: #2c3e50;
}

.room-card button {
  background: #667eea;
  color: white;
  border: none;
  border-radius: 40px;
  padding: 8px 24px;
  cursor: pointer;
  font-weight: bold;
  transition: 0.2s;
}

.room-card button:hover {
  background: #5a67d8;
  transform: scale(1.05);
}

.empty-tip {
  text-align: center;
  color: white;
  font-size: 1.2rem;
  margin-top: 50px;
  text-shadow: 0 1px 2px black;
}
</style>
