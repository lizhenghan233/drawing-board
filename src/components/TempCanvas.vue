<template>
  <canvas
    ref="canvasRef"
    :width="width"
    :height="height"
    @mousedown="startDrawing"
    @mousemove="draw"
    @mouseup="stopDrawing"
    @mouseleave="stopDrawing"
    style="border: 1px solid #ccc; cursor: crosshair"
  ></canvas>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps({
  width: { type: Number, default: 800 },
  height: { type: Number, default: 500 },
})

const emit = defineEmits(['draw', 'clear'])

const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let drawing = false
const currentColor = ref('#000000')
const currentLineWidth = ref(2)

// 历史记录 (存储 dataURL)
const history = ref<string[]>([])
const historyIndex = ref(-1)

// 保存当前状态到历史
const saveState = () => {
  if (!canvasRef.value) return
  const dataURL = canvasRef.value.toDataURL()
  // 如果当前位置不是栈顶，则删除后面的记录
  if (historyIndex.value < history.value.length - 1) {
    history.value = history.value.slice(0, historyIndex.value + 1)
  }
  history.value.push(dataURL)
  historyIndex.value++
}

// 从历史恢复
const restoreFromHistory = () => {
  if (!canvasRef.value || !ctx) return
  const img = new Image()
  img.src = history.value[historyIndex.value]
  img.onload = () => {
    ctx!.clearRect(0, 0, canvasRef.value!.width, canvasRef.value!.height)
    ctx!.drawImage(img, 0, 0)
  }
}

// 撤销
const undo = () => {
  if (historyIndex.value > 0) {
    historyIndex.value--
    restoreFromHistory()
  }
}

// 重做
const redo = () => {
  if (historyIndex.value < history.value.length - 1) {
    historyIndex.value++
    restoreFromHistory()
  }
}

// 设置颜色
const setColor = (color: string) => {
  currentColor.value = color
  if (ctx) ctx.strokeStyle = color
}

// 设置线宽
const setLineWidth = (width: number) => {
  currentLineWidth.value = width
  if (ctx) ctx.lineWidth = width
}

// 清屏
const clearCanvas = () => {
  if (!ctx || !canvasRef.value) return
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
  saveState()
  emit('clear')
}

// 初始化 Canvas 上下文
const initCanvas = () => {
  if (!canvasRef.value) return
  ctx = canvasRef.value.getContext('2d')
  if (ctx) {
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = currentColor.value
    ctx.lineWidth = currentLineWidth.value
  }
}

// 开始绘制
const startDrawing = (e: MouseEvent) => {
  drawing = true
  if (!ctx || !canvasRef.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x, y)
  ctx.stroke()
}

// 绘制中
const draw = (e: MouseEvent) => {
  if (!drawing) return
  if (!ctx || !canvasRef.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  ctx.lineTo(x, y)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x, y)
}

// 结束绘制 -> 保存历史，并发送绘图数据（供 WebSocket 广播）
const stopDrawing = () => {
  if (drawing) {
    drawing = false
    if (ctx) ctx.beginPath()
    saveState()
    // 发送绘图数据给父组件，再由父组件通过 WebSocket 广播
    // 格式可根据角色 C 后续修改，目前简单发送当前笔画的点集（实际应收集整条路径）
    // 这里仅为演示，完整实现需要记录路径坐标数组
    emit('draw', {
      color: currentColor.value,
      lineWidth: currentLineWidth.value,
      // 实际应该将这一笔的坐标点数组发给后端，此处省略具体实现
      message: '一笔绘制完成',
    })
  }
}

onMounted(() => {
  initCanvas()
  saveState() // 保存空白状态
})

defineExpose({
  setColor,
  setLineWidth,
  clearCanvas,
  undo,
  redo,
})
</script>
