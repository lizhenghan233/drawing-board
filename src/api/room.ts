// src/api/room.ts
import { get, post } from './request.ts'

export interface Room {
  id: number
  name: string
  createdBy: number
}

export async function getRooms(): Promise<Room[]> {
  const rooms = await get<Room[]>('/rooms')
  return rooms || []
}

export async function createRoom(name: string, createdBy: number): Promise<Room | null> {
  return post<Room>('/rooms', { name, createdBy })
}
