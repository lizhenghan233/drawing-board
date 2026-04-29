// src/composables/use-toast.ts
import { ref } from 'vue'

const toastVisible = ref(false)
const toastMessage = ref('')
const toastType = ref<'success' | 'error' | 'info'>('info')
let timeoutId: number | null = null

export function showToast(
  msg: string,
  type: 'success' | 'error' | 'info' = 'info',
  duration = 2000,
) {
  toastMessage.value = msg
  toastType.value = type
  toastVisible.value = true
  if (timeoutId) clearTimeout(timeoutId)
  timeoutId = window.setTimeout(() => {
    toastVisible.value = false
  }, duration)
}

export function useToast() {
  return {
    toastVisible,
    toastMessage,
    toastType,
  }
}
