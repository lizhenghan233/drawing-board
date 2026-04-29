// src/stores/userStore.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { login as apiLogin, type User } from '@/api/user'
import { showToast } from '@/composables/useToast'

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const token = ref<string>('')

  const login = async (username: string, password: string) => {
    try {
      const loggedUser = await apiLogin(username, password)
      user.value = loggedUser
      token.value = loggedUser.token
      localStorage.setItem('token', loggedUser.token)
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : '登录失败'
      showToast(message, 'error')
      return false
    }
  }

  const logout = () => {
    user.value = null
    token.value = ''
    localStorage.removeItem('token')
  }

  const restoreToken = () => {
    const t = localStorage.getItem('token')
    if (t) token.value = t
  }

  return { user, token, login, logout, restoreToken }
})
