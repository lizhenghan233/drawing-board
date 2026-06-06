// src/stores/userStore.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { login as apiLogin, logout as apiLogout } from '@/api/user'
import { showToast } from '@/composables/use-toast'
import type { User } from '@/types'

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const token = ref<string>('')

  const login = async (username: string, password: string) => {
    try {
      const loggedUser = await apiLogin(username, password)
      user.value = loggedUser
      token.value = loggedUser.token
      localStorage.setItem('token', loggedUser.token)
      localStorage.setItem(
        'user',
        JSON.stringify({ id: loggedUser.id, username: loggedUser.username }),
      )
      showToast('登录成功', 'success')
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : '登录失败'
      showToast(message, 'error')
      return false
    }
  }

  // 修改 logout 为异步，调用后端接口
  const logout = async () => {
    try {
      if (token.value) {
        await apiLogout(token.value)
      }
    } catch (error) {
      console.error('登出请求失败', error)
    } finally {
      user.value = null
      token.value = ''
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      showToast('已退出登录', 'info')
    }
  }

  const restoreUser = () => {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    if (storedToken && storedUser) {
      token.value = storedToken
      user.value = JSON.parse(storedUser)
    }
  }

  return { user, token, login, logout, restoreUser }
})
