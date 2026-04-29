// src/stores/roomStore.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getRooms, createRoom } from '@/api/room'
import type { Room } from '@/types'

export const useRoomStore = defineStore('room', () => {
  const rooms = ref<Room[]>([])

  const fetchRooms = async () => {
    const data = await getRooms()
    rooms.value = data
  }

  const addRoom = async (name: string, createdBy: number) => {
    const newRoom = await createRoom(name, createdBy)
    if (newRoom) rooms.value.push(newRoom)
    return newRoom
  }

  return { rooms, fetchRooms, addRoom }
})
