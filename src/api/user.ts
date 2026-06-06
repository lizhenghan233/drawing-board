// src/api/user.ts
import { post } from './request'
import type { User } from '@/types'

export async function login(username: string, password: string): Promise<User> {
  const data = await post<{ id: number; username: string; token: string }>('/api/auth/login', {
    username,
    password,
  })
  if (!data) throw new Error('登录失败')
  return { id: String(data.id), username: data.username, token: data.token }
}
export async function register(username: string, password: string): Promise<User> {
  const data = await post<{ id: string; username: string; token: string }>('/api/auth/register', {
    username,
    password,
  })
  if (!data) throw new Error('注册失败')
  return data
}

export async function logout(token: string): Promise<void> {
  await post<void>(
    '/api/auth/logout',
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  )
}
