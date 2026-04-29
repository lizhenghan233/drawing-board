<template>
  <div class="rooms-container">
    <h2>房间列表</h2>
    <div class="create-room">
      <input v-model="newRoomName" placeholder="新房间名称" :disabled="loading" />
      <button @click="handleCreateRoom" :disabled="loading">
        {{ loading ? '创建中...' : '创建房间' }}
      </button>
    </div>
    <ul class="room-list">
      <li v-for="room in roomStore.rooms" :key="room.id">
        <span>{{ room.name }}</span>
        <button @click="joinRoom(room.id)">加入</button>
      </li>
    </ul>
    <p v-if="roomStore.rooms.length === 0">暂无房间，请创建一个</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRoomStore } from '@/stores/roomStore'
import { useUserStore } from '@/stores/userStore'
import { showToast } from '@/composables/useToast'

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
  width: 600px;
  margin: 50px auto;
}
.create-room {
  margin-bottom: 20px;
}
.create-room input {
  margin-right: 10px;
  padding: 5px;
}
.room-list {
  list-style: none;
  padding: 0;
}
.room-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 10px 0;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.room-list button {
  padding: 4px 12px;
}
</style>
