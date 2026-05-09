<template>
  <div class="canvas-wrapper" style="position: relative; touch-action: none;">
    <canvas
      ref="canvasEl"
      class="canvas"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseUp"
      @touchstart.prevent="onTouchStart"
      @touchmove.prevent="onTouchMove"
      @touchend.prevent="onTouchEnd"
    ></canvas>

    <!-- 文本输入框 -->
    <input
      v-if="textInputVisible"
      ref="textInputRef"
      v-model="textValue"
      class="text-input"
      :style="textInputStyle"
      @blur="commitText"
      @keyup.enter="commitText"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useDrawingEngine } from '@/composables/useDrawingEngine'
import { useWebSocket } from '@/composables/use-websocket'
import type { DrawAction, ToolType, Point } from '@/types'

// Props
const props = defineProps<{
  userId: number
  roomId?: string   // 备用
}>()

const emit = defineEmits<{
  (e: 'draw', action: DrawAction): void
  (e: 'clear'): void
}>()

// 引擎
const engine = useDrawingEngine(props.userId)

// Canvas DOM
const canvasEl = ref<HTMLCanvasElement | null>(null)

// 文本输入相关
const textInputVisible = ref(false)
const textValue = ref('')
const textInputStyle = ref({})
const textInputRef = ref<HTMLInputElement | null>(null)
let textPoint: Point | null = null

function openTextInput(point: Point) {
  textPoint = point
  textValue.value = ''
  textInputStyle.value = {
    left: point.x + 'px',
    top: point.y + 'px',
  }
  textInputVisible.value = true
  nextTick(() => {
    textInputRef.value?.focus()
  })
}

function commitText() {
  if (!textValue.value.trim()) {
    textInputVisible.value = false
    return
  }
  const action = engine.addTextAction(textValue.value.trim(), textPoint!)
  emit('draw', action)
  textInputVisible.value = false
  textValue.value = ''
}

// 注册文本输入回调
engine.registerTextInput(openTextInput)

// ---------- WebSocket 消息同步 ----------
const { send, on, off } = useWebSocket()

// 监听远程绘图消息（本地绘制不在此处理，避免重复）
const remoteHandler = (data: unknown) => {
  const action = data as DrawAction
  if (action.userId !== props.userId) {
    engine.drawRemote(action)
  }
}

// 监听远程清屏（可选）
const clearHandler = (_data: unknown) => {
  // 简单起见，不自动清屏，可根据需求扩展
}

onMounted(() => {
  // 初始化 Canvas（尺寸由 resize 决定）
  const canvas = canvasEl.value!
  engine.initCanvas(canvas)
  // 初次调节尺寸
  handleResize()
  window.addEventListener('resize', handleResize)

  // 注册 WebSocket 事件（注意：BoardView 已经 connect，这里只监听）
  on('draw', remoteHandler)
  on('clear', clearHandler)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  off('draw', remoteHandler)
  off('clear', clearHandler)
})

// ---------- 自适应尺寸（与 TempCanvas 行为一致）----------
function handleResize() {
  const canvas = canvasEl.value
  if (!canvas) return
  const parent = canvas.parentElement
  if (!parent) return
  const rect = parent.getBoundingClientRect()
  const oldWidth = canvas.width
  const oldHeight = canvas.height
  if (rect.width !== oldWidth || rect.height !== oldHeight) {
    canvas.width = rect.width
    canvas.height = rect.height
    engine.handleResize()
  }
}

// ---------- 事件分发（适配鼠标和触摸）----------
function onMouseDown(e: MouseEvent) { engine.onPointerDown(e) }
function onMouseMove(e: MouseEvent) { engine.onPointerMove(e) }
function onMouseUp(e: MouseEvent) {
  const action = engine.onPointerUp(e)
  if (action) emit('draw', action)
}

function onTouchStart(e: TouchEvent) { engine.onPointerDown(e) }
function onTouchMove(e: TouchEvent) { engine.onPointerMove(e) }
function onTouchEnd(e: TouchEvent) {
  const action = engine.onPointerUp(e)
  if (action) emit('draw', action)
}

// ---------- 向外部暴露的控制接口 ----------
defineExpose({
  setColor: engine.setColor,
  setLineWidth: engine.setLineWidth,
  setTool: (tool: ToolType) => engine.setTool(tool),
  clearCanvas: () => {
    engine.clearCanvas()
    emit('clear')
    // 通知远端清屏（可选）
    send('clear', { userId: props.userId })
  },
  undo: engine.undo,
  redo: engine.redo,
  canUndo: engine.canUndo,
  canRedo: engine.canRedo,
  loadSnapshot: engine.loadSnapshot,
  drawRemote: engine.drawRemote,
})
</script>

<style scoped>
.canvas-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
}
.canvas {
  width: 100%;
  height: 100%;
  display: block;
  border: 1px solid #ccc;
  cursor: crosshair;
}
.text-input {
  position: absolute;
  min-width: 80px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px dashed #333;
  outline: none;
  font-size: 16px;
  padding: 2px 5px;
}
</style>