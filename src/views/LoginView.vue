<template>
  <div class="login-container">
    <h2>多人绘图白板 - 登录</h2>
    <input v-model="username" placeholder="用户名" :disabled="loading" />
    <input v-model="password" type="password" placeholder="密码" :disabled="loading" />
    <button @click="handleLogin" :disabled="loading">
      {{ loading ? '登录中...' : '登录' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'

const username = ref('')
const password = ref('')
const loading = ref(false)
const router = useRouter()
const userStore = useUserStore()

async function handleLogin() {
  if (!username.value.trim() || !password.value.trim()) {
    const { showToast } = await import('@/composables/useToast')
    showToast('请输入用户名和密码', 'error')
    return
  }
  loading.value = true
  const success = await userStore.login(username.value, password.value)
  loading.value = false
  if (success) {
    router.push('/rooms')
  }
}
</script>

<style scoped>
.login-container {
  width: 300px;
  margin: 100px auto;
  text-align: center;
}
input,
button {
  display: block;
  width: 100%;
  margin: 10px 0;
  padding: 8px;
  box-sizing: border-box;
}
</style>
