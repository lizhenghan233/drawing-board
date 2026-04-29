<template>
  <canvas
    ref="canvasRef"
    class="canvas"
    @mousedown="startDrawing"
    @mousemove="draw"
    @mouseup="stopDrawing"
    @mouseleave="stopDrawing"
  ></canvas>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const emit = defineEmits(['draw', 'clear'])

const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let drawing = false
const currentColor = ref('#000000')
const currentLineWidth = ref(2)

// 历史记录
const history = ref<string[]>([])
const historyIndex = ref(-1)

// 实际像素尺寸
let actualWidth = 0
let actualHeight = 0

function initCanvas() {
  if (!canvasRef.value) return
  const container = canvasRef.value.parentElement
  if (!container) return
  const rect = container.getBoundingClientRect()
  actualWidth = rect.width
  actualHeight = rect.height
  canvasRef.value.width = actualWidth
  canvasRef.value.height = actualHeight

  ctx = canvasRef.value.getContext('2d')
  if (ctx) {
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = currentColor.value
    ctx.lineWidth = currentLineWidth.value
    ctx.clearRect(0, 0, actualWidth, actualHeight)
    saveState()
  }
}

function resizeCanvas() {
  if (!canvasRef.value) return
  const container = canvasRef.value.parentElement
  if (!container) return
  const rect = container.getBoundingClientRect()
  if (rect.width === actualWidth && rect.height === actualHeight) return
  const oldDataURL = canvasRef.value.toDataURL()
  actualWidth = rect.width
  actualHeight = rect.height
  canvasRef.value.width = actualWidth
  canvasRef.value.height = actualHeight
  if (ctx) {
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = currentColor.value
    ctx.lineWidth = currentLineWidth.value
    const img = new Image()
    img.src = oldDataURL
    img.onload = () => {
      ctx?.drawImage(img, 0, 0, actualWidth, actualHeight)
    }
  }
}

const saveState = () => {
  if (!canvasRef.value) return
  const dataURL = canvasRef.value.toDataURL()
  if (historyIndex.value < history.value.length - 1) {
    history.value = history.value.slice(0, historyIndex.value + 1)
  }
  history.value.push(dataURL)
  historyIndex.value++
}

const restoreFromHistory = () => {
  if (!canvasRef.value || !ctx) return
  if (historyIndex.value < 0 || historyIndex.value >= history.value.length) return
  const dataURL = history.value[historyIndex.value]
  if (!dataURL) return

  const img = new Image()
  img.src = dataURL
  img.onload = () => {
    ctx!.clearRect(0, 0, canvasRef.value!.width, canvasRef.value!.height)
    ctx!.drawImage(img, 0, 0)
  }
}

const undo = () => {
  if (historyIndex.value > 0) {
    historyIndex.value--
    restoreFromHistory()
  }
}

const redo = () => {
  if (historyIndex.value < history.value.length - 1) {
    historyIndex.value++
    restoreFromHistory()
  }
}

const setColor = (color: string) => {
  currentColor.value = color
  if (ctx) ctx.strokeStyle = color
}

const setLineWidth = (width: number) => {
  currentLineWidth.value = width
  if (ctx) ctx.lineWidth = width
}

const clearCanvas = () => {
  if (!ctx || !canvasRef.value) return
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
  saveState()
  emit('clear')
}

const startDrawing = (e: MouseEvent) => {
  drawing = true
  if (!ctx || !canvasRef.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  const scaleX = canvasRef.value.width / rect.width
  const scaleY = canvasRef.value.height / rect.height
  const x = (e.clientX - rect.left) * scaleX
  const y = (e.clientY - rect.top) * scaleY
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x, y)
  ctx.stroke()
}

const draw = (e: MouseEvent) => {
  if (!drawing) return
  if (!ctx || !canvasRef.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  const scaleX = canvasRef.value.width / rect.width
  const scaleY = canvasRef.value.height / rect.height
  const x = (e.clientX - rect.left) * scaleX
  const y = (e.clientY - rect.top) * scaleY
  ctx.lineTo(x, y)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x, y)
}

const stopDrawing = () => {
  if (drawing) {
    drawing = false
    if (ctx) ctx.beginPath()
    saveState()
    emit('draw', {
      color: currentColor.value,
      lineWidth: currentLineWidth.value,
      message: '一笔绘制完成',
    })
  }
}

onMounted(() => {
  initCanvas()
  window.addEventListener('resize', () => {
    resizeCanvas()
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
})

defineExpose({
  setColor,
  setLineWidth,
  clearCanvas,
  undo,
  redo,
})
</script>

<style scoped>
.canvas {
  width: 100%;
  height: 100%;
  display: block;
  border: 1px solid #ccc;
  cursor: crosshair;
}
</style>
