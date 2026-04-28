// src/stores/userStore.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { login as apiLogin, type User } from '@/api/user'

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const token = ref<string>('')

  const login = async (username: string, password: string) => {
    const loggedUser = await apiLogin(username, password)
    if (loggedUser) {
      user.value = loggedUser
      token.value = loggedUser.token
      localStorage.setItem('token', loggedUser.token)
      return true
    }
    return false
  }

  const logout = () => {
    user.value = null
    token.value = ''
    localStorage.removeItem('token')
  }

  // 页面刷新时恢复 token（可选，后续可用于自动登录）
  const restoreToken = () => {
    const t = localStorage.getItem('token')
    if (t) token.value = t
  }

  return { user, token, login, logout, restoreToken }
})
