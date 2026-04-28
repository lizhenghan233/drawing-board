// src/stores/roomStore.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getRooms, createRoom, type Room } from '@/api/room'

export const useRoomStore = defineStore('room', () => {
  const rooms = ref<Room[]>([])

  const fetchRooms = async () => {
    const data = await getRooms()
    rooms.value = data
  }

  const addRoom = async (name: string, createdBy: number) => {
    const newRoom = await createRoom(name, createdBy)
    rooms.value.push(newRoom) // 更新本地列表
    return newRoom
  }

  return { rooms, fetchRooms, addRoom }
})
