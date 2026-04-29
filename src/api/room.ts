// src/api/room.ts
import { get, post } from './request'
import type { Room } from '@/types'

export async function getRooms(): Promise<Room[]> {
  const rooms = await get<Room[]>('/rooms')
  return rooms || []
}

export async function createRoom(name: string, createdBy: number): Promise<Room | null> {
  return post<Room>('/rooms', { name, createdBy })
}
