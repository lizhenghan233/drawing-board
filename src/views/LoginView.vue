<template>
  <div class="login-container">
    <div class="carousel">
      <div
        v-for="(img, index) in backgrounds"
        :key="index"
        class="carousel-slide"
        :class="{ active: currentIndex === index }"
        :style="{ backgroundImage: `url(${img})` }"
      ></div>
    </div>
    <div class="overlay"></div>
    <div class="login-card">
      <h2>🎨 多人绘图白板</h2>
      <input v-model="username" placeholder="用户名" :disabled="loading" />
      <input v-model="password" type="password" placeholder="密码" :disabled="loading" />
      <button @click="handleLogin" :disabled="loading">
        {{ loading ? '登录中...' : '登录' }}
      </button>
      <div class="register-link">
        还没有账号？ <router-link to="/register">立即注册</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'

const username = ref('')
const password = ref('')
const loading = ref(false)
const router = useRouter()
const userStore = useUserStore()

// 轮播背景图片列表
const backgrounds = [
  'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?q=80&w=2070&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=1974&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop',
]

const currentIndex = ref(0)
let intervalId: number | null = null

const startCarousel = () => {
  intervalId = window.setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % backgrounds.length
  }, 5000)
}

const stopCarousel = () => {
  if (intervalId) clearInterval(intervalId)
}

async function handleLogin() {
  if (!username.value.trim() || !password.value.trim()) {
    const { showToast } = await import('@/composables/use-toast')
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

onMounted(() => {
  startCarousel()
})
onUnmounted(() => {
  stopCarousel()
})
</script>

<style scoped>
/* 样式保持不变，仅增加注册链接样式 */
.login-container {
  position: relative;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}
.carousel {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}
.carousel-slide {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  opacity: 0;
  transition: opacity 1.2s ease-in-out;
}
.carousel-slide.active {
  opacity: 1;
}
.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1;
}
.login-card {
  position: relative;
  z-index: 2;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(2px);
  padding: 40px 32px;
  border-radius: 24px;
  box-shadow: 0 20px 35px rgba(0, 0, 0, 0.2);
  width: 360px;
  text-align: center;
  transition: transform 0.2s;
}
.login-card:hover {
  transform: translateY(-5px);
}
.login-card h2 {
  margin-bottom: 28px;
  color: #2c3e50;
  font-weight: 600;
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
  transition: all 0.2s;
}
input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
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
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.register-link {
  margin-top: 20px;
  font-size: 14px;
  color: #555;
}
.register-link a {
  color: #667eea;
  text-decoration: none;
  font-weight: bold;
}
.register-link a:hover {
  text-decoration: underline;
}
</style>
