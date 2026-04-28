// src/api/room.ts
const API_BASE = 'http://localhost:3001'

export interface Room {
  id: number
  name: string
  createdBy: number // 创建者的用户ID
}

// 获取所有房间
export async function getRooms(): Promise<Room[]> {
  const res = await fetch(`${API_BASE}/rooms`)
  const rooms = await res.json()
  return rooms
}

// 创建新房间
export async function createRoom(name: string, createdBy: number): Promise<Room> {
  const res = await fetch(`${API_BASE}/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, createdBy }),
  })
  const newRoom = await res.json()
  return newRoom
}
