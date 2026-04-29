// src/api/user.ts
import { get } from './request'
import type { JsonUser, User } from '@/types'

export async function login(username: string, password: string): Promise<User> {
  const users = await get<JsonUser[]>('/users')
  const found = users.find((u) => u.username === username && u.password === password)
  if (!found) {
    throw new Error('用户名或密码错误')
  }
  return { id: found.id, username: found.username, token: found.token }
}
