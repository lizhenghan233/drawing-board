<template>
  <div class="canvas-wrapper" style="position: relative; touch-action: none">
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
import type { DrawAction, ToolType, Point } from '@/types'

const props = defineProps<{
  userId: number
  roomId?: string
}>()

const emit = defineEmits<{
  (e: 'draw', action: DrawAction): void
  (e: 'clear'): void
}>()

const engine = useDrawingEngine(props.userId)
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

engine.registerTextInput(openTextInput)

// 转换点格式：Point[] -> number[][]
function convertToNumberArray(points?: Point[]): number[][] | undefined {
  if (!points) return undefined
  return points.map((p) => [p.x, p.y])
}

// 确保发送的 DrawAction 中 points 为 number[][]
function normalizeAction(action: DrawAction): DrawAction {
  if (!action.points) return action
  const firstPoint = action.points[0]
  // 如果第一个点具有 x 属性，说明是 Point[] 格式，需要转换
  if (
    Array.isArray(action.points) &&
    firstPoint &&
    typeof firstPoint === 'object' &&
    'x' in firstPoint
  ) {
    return {
      ...action,
      points: convertToNumberArray(action.points as unknown as Point[]),
    }
  }
  return action
}

onMounted(() => {
  const canvas = canvasEl.value!
  engine.initCanvas(canvas)
  handleResize()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

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

function onMouseDown(e: MouseEvent) {
  engine.onPointerDown(e)
}
function onMouseMove(e: MouseEvent) {
  engine.onPointerMove(e)
}
function onMouseUp(e: MouseEvent) {
  const action = engine.onPointerUp(e)
  if (action) {
    emit('draw', normalizeAction(action))
  }
}

function onTouchStart(e: TouchEvent) {
  engine.onPointerDown(e)
}
function onTouchMove(e: TouchEvent) {
  engine.onPointerMove(e)
}
function onTouchEnd(e: TouchEvent) {
  const action = engine.onPointerUp(e)
  if (action) {
    emit('draw', normalizeAction(action))
  }
}

defineExpose({
  setColor: engine.setColor,
  setLineWidth: engine.setLineWidth,
  setTool: (tool: ToolType) => engine.setTool(tool),
  clearCanvas: () => {
    engine.clearCanvas()
    emit('clear')
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
