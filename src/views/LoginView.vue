<!-- src/views/LoginView.vue -->
<template>
  <div class="login-container">
    <h2>多人绘图白板 - 登录</h2>
    <input v-model="username" placeholder="用户名" />
    <input v-model="password" type="password" placeholder="密码" />
    <button @click="handleLogin">登录</button>
    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'

const username = ref('')
const password = ref('')
const errorMsg = ref('')
const router = useRouter()
const userStore = useUserStore()

async function handleLogin() {
  errorMsg.value = ''
  const success = await userStore.login(username.value, password.value)
  if (success) {
    router.push('/rooms')
  } else {
    errorMsg.value = '用户名或密码错误'
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
.error {
  color: red;
}
</style>
