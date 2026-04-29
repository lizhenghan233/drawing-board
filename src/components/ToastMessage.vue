<!-- src/components/ToastMessage.vue -->
<template>
  <Transition name="fade">
    <div v-if="toastVisible" class="toast" :class="toastType">
      {{ toastMessage }}
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { toastVisible, toastMessage, toastType } = useToast()
</script>

<style scoped>
.toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 16px;
  border-radius: 4px;
  color: white;
  font-size: 14px;
  z-index: 9999;
  white-space: nowrap;
}
.toast.success {
  background-color: #28a745;
}
.toast.error {
  background-color: #dc3545;
}
.toast.info {
  background-color: #17a2b8;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
