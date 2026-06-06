<template>
  <div class="register-container">
    <div class="register-card">
      <h2>📝 注册新账号</h2>
      <input v-model="username" placeholder="用户名" :disabled="loading" />
      <input v-model="password" type="password" placeholder="密码" :disabled="loading" />
      <input v-model="confirmPassword" type="password" placeholder="确认密码" :disabled="loading" />
      <button @click="handleRegister" :disabled="loading">
        {{ loading ? '注册中...' : '注册' }}
      </button>
      <div class="login-link">已有账号？ <router-link to="/login">立即登录</router-link></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { register } from '@/api/user'
import { showToast } from '@/composables/use-toast'

const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const router = useRouter()

async function handleRegister() {
  if (!username.value.trim()) {
    showToast('请输入用户名', 'error')
    return
  }
  if (!password.value) {
    showToast('请输入密码', 'error')
    return
  }
  if (password.value !== confirmPassword.value) {
    showToast('两次输入的密码不一致', 'error')
    return
  }
  loading.value = true
  try {
    const newUser = await register(username.value, password.value)
    if (newUser) {
      showToast('注册成功！请登录', 'success')
      router.push('/login')
    } else {
      showToast('注册失败，请稍后重试', 'error')
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '注册失败'
    showToast(message, 'error')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-container {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.register-card {
  background: white;
  padding: 40px 32px;
  border-radius: 24px;
  box-shadow: 0 20px 35px rgba(0, 0, 0, 0.2);
  width: 360px;
  text-align: center;
}
.register-card h2 {
  margin-bottom: 28px;
  color: #2c3e50;
}
input,
button {
  display: block;
  width: 100%;
  margin: 12px 0;
  padding: 12px;
  box-sizing: border-box;
  border-radius: 40px;
  border: 1px solid #ddd;
  font-size: 16px;
}
input:focus {
  outline: none;
  border-color: #667eea;
}
button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  cursor: pointer;
  font-weight: bold;
  margin-top: 20px;
}
button:hover:not(:disabled) {
  opacity: 0.9;
  transform: scale(1.02);
}
.login-link {
  margin-top: 20px;
  font-size: 14px;
}
.login-link a {
  color: #667eea;
  text-decoration: none;
}
.login-link a:hover {
  text-decoration: underline;
}
</style>
