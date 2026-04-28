// src/api/user.ts
const API_BASE = 'http://localhost:3001'

export interface User {
  id: string
  username: string
  token: string
}

export async function login(username: string, password: string): Promise<User | null> {
  // 获取所有用户
  const res = await fetch(`${API_BASE}/users`)
  const users = await res.json()
  // 在前端查找匹配的用户名和密码
  const found = users.find((u: any) => u.username === username && u.password === password)
  if (found) {
    // 返回需要的用户信息（不包含密码）
    return { id: found.id, username: found.username, token: found.token }
  }
  return null
}
