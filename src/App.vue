<!-- src/App.vue -->
<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import ToastMessage from '@/components/ToastMessage.vue'

const userStore = useUserStore()

onMounted(() => {
  userStore.restoreUser()
})
</script>

<template>
  <RouterView />
  <ToastMessage />
</template>
