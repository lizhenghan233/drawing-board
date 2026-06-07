<template>
  <div
    class="canvas-wrapper"
    style="touch-action: none"
    @wheel.prevent="engine.onWheel"
    @contextmenu.prevent
  >
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

    <!-- 文本输入框（新建或再编辑） -->
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
import type { DrawAction, ToolType, Point, TextData } from '@/types'

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

// ---------- 文本输入状态 ----------
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
  nextTick(() => textInputRef.value?.focus())
}

function commitText() {
  const trimmed = textValue.value.trim()
  if (!trimmed) {
    textInputVisible.value = false
    return
  }
  if (textPoint) {
    const action = engine.addTextAction(trimmed, textPoint)
    emit('draw', action)
  }
  textInputVisible.value = false
}


engine.registerTextInput(openTextInput)

// ---------- 快捷键 ----------
function onKeyDown(e: KeyboardEvent) {
  // 如果焦点在输入框内，不处理快捷键（留给文本编辑）
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

  const key = e.key.toLowerCase()
  if (key === 'p') engine.setTool('pen')
  else if (key === 'r') engine.setTool('rect')
  else if (key === 'c') engine.setTool('circle')
  else if (key === 't') engine.setTool('text')
  else if (key === 'e') engine.setTool('eraser')
  else if (key === 'z' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    if (e.shiftKey) engine.redo()
    else engine.undo()
  }
  else if (key === 'y' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    engine.redo()
  }
  else if (key === '1') { engine.view.value.scale = Math.min(10, engine.view.value.scale * 1.1); engine.requestRedraw() }
  else if (key === '2') { engine.view.value.scale = Math.max(0.1, engine.view.value.scale * 0.9); engine.requestRedraw() }
}

// ---------- 尺寸自适应 ----------
function handleResize() {
  const canvas = canvasEl.value
  if (!canvas) return
  const parent = canvas.parentElement
  if (!parent) return
  const rect = parent.getBoundingClientRect()
  if (rect.width !== canvas.width || rect.height !== canvas.height) {
    canvas.width = rect.width
    canvas.height = rect.height
    engine.handleResize()
  }
}

// ---------- 事件分发 ----------
function onMouseDown(e: MouseEvent)  { engine.onPointerDown(e) }
function onMouseMove(e: MouseEvent)  { engine.onPointerMove(e) }
function onMouseUp(e: MouseEvent)    {
  const action = engine.onPointerUp(e)
  if (action) emit('draw', normalizeAction(action))
}
function onTouchStart(e: TouchEvent) { engine.onPointerDown(e) }
function onTouchMove(e: TouchEvent)  { engine.onPointerMove(e) }
function onTouchEnd(e: TouchEvent)   {
  const action = engine.onPointerUp(e)
  if (action) emit('draw', normalizeAction(action))
}

// 确保发送的数据永远是 DrawAction 格式（兼容旧 points 格式）
function normalizeAction(action: DrawAction): DrawAction {
  // 如果 action 包含旧的 points: number[][] 则转为 { points: Point[] }
  if ((action as any).points && !(action.data as any)?.points) {
    const pts = (action as any).points as number[][]
    return {
      ...action,
      data: { points: pts.map(([x, y]) => ({ x, y })) },
    }
  }
  return action
}

// ---------- 生命周期 ----------
onMounted(() => {
  const canvas = canvasEl.value!
  engine.initCanvas(canvas)
  handleResize()
  window.addEventListener('resize', handleResize)
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('keydown', onKeyDown)
})

// ---------- 对外暴露 ----------
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
  view: engine.view,
})
</script>

<style scoped>
.canvas-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
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
  z-index: 10;
}
</style>