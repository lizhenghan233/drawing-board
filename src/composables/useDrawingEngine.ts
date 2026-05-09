// src/composables/useDrawingEngine.ts
import { ref, shallowRef } from 'vue'
import type { DrawAction, ToolType, Point } from '@/types'

let nextId = 0
function generateId(): string {
  return `action_${Date.now()}_${nextId++}_${Math.random().toString(36).substr(2, 9)}`
}

export function useDrawingEngine(userId: number) {
  // ---------- Canvas 引用 ----------
  const mainCanvasRef = ref<HTMLCanvasElement | null>(null)

  // 离屏 Canvas（内存中渲染全部指令，避免闪烁）
  const offscreenCanvas = document.createElement('canvas')
  const offCtx = offscreenCanvas.getContext('2d')!

  // 当前工具 & 样式
  const currentTool = ref<ToolType>('pen')
  const currentColor = ref('#000000')
  const currentLineWidth = ref(3)

  // 所有绘制指令（自己和他人）
  const allActions = shallowRef<DrawAction[]>([])

  // 撤销 / 重做栈（只存储本地的 action 对象）
  const undoStack = ref<DrawAction[]>([])
  const redoStack = ref<DrawAction[]>([])

  // 是否正在绘制
  let isDrawing = false
  let startPoint: Point | null = null
  let currentPoints: Point[] = []  // 自由画笔的点序列

  // 异步重绘控制
  let rafId: number | null = null
  let needRedraw = false

  // 文本工具用（外部注入）
  let showTextInput: ((point: Point) => void) | null = null

  // 状态
  const canUndo = ref(false)
  const canRedo = ref(false)

  function updateUndoRedoState() {
    canUndo.value = undoStack.value.length > 0
    canRedo.value = redoStack.value.length > 0
  }

  // ---------- Canvas 初始化 ----------
  function initCanvas(canvas: HTMLCanvasElement) {
    mainCanvasRef.value = canvas
    resizeOffscreen()
    requestRedraw()
  }

  function resizeOffscreen() {
    const main = mainCanvasRef.value
    if (!main) return
    offscreenCanvas.width = main.width
    offscreenCanvas.height = main.height
    offCtx.lineCap = 'round'
    offCtx.lineJoin = 'round'
  }

  // 确保画布尺寸跟随窗口（暴露给外部调用）
  function handleResize() {
    const main = mainCanvasRef.value
    if (!main) return
    const parent = main.parentElement
    if (!parent) return
    const rect = parent.getBoundingClientRect()
    if (rect.width !== main.width || rect.height !== main.height) {
      main.width = rect.width
      main.height = rect.height
      resizeOffscreen()
      requestRedraw()
    }
  }

  // ---------- 离屏渲染全部指令 ----------
  function renderAllToOffscreen() {
    if (!offscreenCanvas.width || !offscreenCanvas.height) return
    offCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height)
    for (const action of allActions.value) {
      drawActionOnContext(offCtx, action)
    }
  }

  function drawActionOnContext(ctx: CanvasRenderingContext2D, action: DrawAction) {
    ctx.save()
    ctx.strokeStyle = action.color
    ctx.fillStyle = action.color
    ctx.lineWidth = action.lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    switch (action.tool) {
      case 'pen': {
        const pts = (action.data as any).points as Point[]
        if (pts && pts.length > 1) {
          ctx.beginPath()
          ctx.moveTo(pts[0].x, pts[0].y)
          for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i].y)
          }
          ctx.stroke()
        }
        break
      }
      case 'rect': {
        const d = action.data as any
        ctx.strokeRect(d.x, d.y, d.width, d.height)
        break
      }
      case 'circle': {
        const d = action.data as any
        ctx.beginPath()
        ctx.arc(d.cx, d.cy, d.radius, 0, Math.PI * 2)
        ctx.stroke()
        break
      }
      case 'text': {
        const d = action.data as any
        ctx.font = `${action.lineWidth * 5}px sans-serif`
        ctx.fillText(d.text, d.x, d.y)
        break
      }
    }
    ctx.restore()
  }

  // 将离屏画布一次性绘制到主 Canvas
  function flushToMainCanvas() {
    const main = mainCanvasRef.value
    if (!main) return
    const ctx = main.getContext('2d')!
    ctx.clearRect(0, 0, main.width, main.height)
    ctx.drawImage(offscreenCanvas, 0, 0)
  }

  function requestRedraw() {
    needRedraw = true
    if (rafId) return
    rafId = requestAnimationFrame(() => {
      renderAllToOffscreen()
      flushToMainCanvas()
      rafId = null
      needRedraw = false
    })
  }

  // ---------- 历史栈操作 ----------
  function pushAction(action: DrawAction, isLocal: boolean) {
    allActions.value = [...allActions.value, action]
    if (isLocal) {
      undoStack.value.push(action)
      redoStack.value = []   // 新操作清空重做栈
    }
    updateUndoRedoState()
    requestRedraw()
  }

  function removeActionById(id: string) {
    allActions.value = allActions.value.filter(a => a.id !== id)
    requestRedraw()
  }

  function undo() {
    if (undoStack.value.length === 0) return
    const action = undoStack.value.pop()!
    redoStack.value.push(action)
    removeActionById(action.id)
    updateUndoRedoState()
  }

  function redo() {
    if (redoStack.value.length === 0) return
    const action = redoStack.value.pop()!
    undoStack.value.push(action)
    allActions.value = [...allActions.value, action]
    updateUndoRedoState()
    requestRedraw()
  }

  // ---------- 坐标转换 ----------
  function getCanvasPoint(e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement): Point {
    const rect = canvas.getBoundingClientRect()
    const clientX = (e as TouchEvent).touches
      ? (e as TouchEvent).touches[0].clientX
      : (e as MouseEvent).clientX
    const clientY = (e as TouchEvent).touches
      ? (e as TouchEvent).touches[0].clientY
      : (e as MouseEvent).clientY
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  // ---------- 鼠标 / 触摸事件 ----------
  function onPointerDown(e: MouseEvent | TouchEvent) {
    e.preventDefault()
    const canvas = mainCanvasRef.value
    if (!canvas) return
    const point = getCanvasPoint(e, canvas)

    // 文本工具：弹输入框（不进入绘制状态）
    if (currentTool.value === 'text') {
      showTextInput?.(point)
      return
    }

    isDrawing = true
    startPoint = point
    currentPoints = [point]
  }

  function onPointerMove(e: MouseEvent | TouchEvent) {
    if (!isDrawing) return
    e.preventDefault()
    const canvas = mainCanvasRef.value!
    const point = getCanvasPoint(e, canvas)
    const ctx = canvas.getContext('2d')!

    // 恢复离屏内容，再画预览
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(offscreenCanvas, 0, 0)

    ctx.save()
    ctx.strokeStyle = currentColor.value
    ctx.lineWidth = currentLineWidth.value
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    switch (currentTool.value) {
      case 'pen': {
        ctx.beginPath()
        ctx.moveTo(currentPoints[currentPoints.length - 1].x, currentPoints[currentPoints.length - 1].y)
        ctx.lineTo(point.x, point.y)
        ctx.stroke()
        currentPoints.push(point)
        break
      }
      case 'rect': {
        const x = Math.min(startPoint!.x, point.x)
        const y = Math.min(startPoint!.y, point.y)
        const w = Math.abs(point.x - startPoint!.x)
        const h = Math.abs(point.y - startPoint!.y)
        ctx.strokeRect(x, y, w, h)
        break
      }
      case 'circle': {
        const dx = point.x - startPoint!.x
        const dy = point.y - startPoint!.y
        const radius = Math.sqrt(dx * dx + dy * dy)
        ctx.beginPath()
        ctx.arc(startPoint!.x, startPoint!.y, radius, 0, Math.PI * 2)
        ctx.stroke()
        break
      }
    }
    ctx.restore()
  }

  function onPointerUp(e: MouseEvent | TouchEvent): DrawAction | null {
    if (!isDrawing) return null
    isDrawing = false
    const canvas = mainCanvasRef.value!
    const point = getCanvasPoint(e, canvas)

    let action: DrawAction | null = null

    switch (currentTool.value) {
      case 'pen': {
        if (currentPoints.length > 1) {
          action = {
            id: generateId(),
            userId,
            tool: 'pen',
            color: currentColor.value,
            lineWidth: currentLineWidth.value,
            data: { points: [...currentPoints] },
          }
        }
        break
      }
      case 'rect': {
        const x = Math.min(startPoint!.x, point.x)
        const y = Math.min(startPoint!.y, point.y)
        const w = Math.abs(point.x - startPoint!.x)
        const h = Math.abs(point.y - startPoint!.y)
        if (w > 0 || h > 0) {
          action = {
            id: generateId(),
            userId,
            tool: 'rect',
            color: currentColor.value,
            lineWidth: currentLineWidth.value,
            data: { x, y, width: w, height: h },
          }
        }
        break
      }
      case 'circle': {
        const dx = point.x - startPoint!.x
        const dy = point.y - startPoint!.y
        const radius = Math.sqrt(dx * dx + dy * dy)
        if (radius > 0) {
          action = {
            id: generateId(),
            userId,
            tool: 'circle',
            color: currentColor.value,
            lineWidth: currentLineWidth.value,
            data: { cx: startPoint!.x, cy: startPoint!.y, radius },
          }
        }
        break
      }
    }

    if (action) {
      pushAction(action, true)   // 本地操作
    }
    // 最终刷新，保证画面干净
    requestRedraw()
    return action
  }

  // ---------- 文本工具：创建文字指令 ----------
  function addTextAction(text: string, point: Point) {
    const action: DrawAction = {
      id: generateId(),
      userId,
      tool: 'text',
      color: currentColor.value,
      lineWidth: currentLineWidth.value,
      data: { text, x: point.x, y: point.y },
    }
    pushAction(action, true)
    return action
  }

  // ---------- 外部调用 API ----------
  function setColor(color: string) { currentColor.value = color }
  function setLineWidth(w: number) { currentLineWidth.value = w }
  function setTool(tool: ToolType) { currentTool.value = tool }

  function clearCanvas() {
    allActions.value = []
    undoStack.value = []
    redoStack.value = []
    updateUndoRedoState()
    requestRedraw()
  }

  function loadSnapshot(actions: DrawAction[]) {
    allActions.value = actions
    undoStack.value = []
    redoStack.value = []
    updateUndoRedoState()
    requestRedraw()
  }

  // 远程绘制：直接追加非本地指令
  function drawRemote(action: DrawAction) {
    pushAction(action, false)   // 不是本地操作，不加入 undo/redo
  }

  function registerTextInput(fn: (point: Point) => void) {
    showTextInput = fn
  }

  return {
    mainCanvasRef,
    canUndo,
    canRedo,
    currentColor,
    currentLineWidth,
    currentTool,
    initCanvas,
    handleResize,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    setColor,
    setLineWidth,
    setTool,
    clearCanvas,
    undo,
    redo,
    loadSnapshot,
    drawRemote,
    addTextAction,
    registerTextInput,
    pushAction,   // 供极端情况使用
  }
}