// src/composables/useDrawingEngine.ts
import { ref, shallowRef } from 'vue'
import type { DrawAction, ToolType, Point, ViewTransform, TextData } from '@/types'

let nextId = 0
function generateId(): string {
  return `action_${Date.now()}_${nextId++}_${Math.random().toString(36).substr(2, 9)}`
}

// 辅助：将旧版 points: number[][] 转为 Point[]
function normalizeOldPoints(points?: unknown): Point[] | null {
  if (!Array.isArray(points) || points.length === 0) return null
  const first = points[0]
  if (typeof first === 'object' && first !== null && 'x' in first) {
    return points as unknown as Point[]
  }
  if (Array.isArray(first)) {
    return (points as number[][]).map(([x, y]) => ({ x, y }))
  }
  return null
}

export function useDrawingEngine(userId: number) {
  // ---------- Canvas 引用 ----------
  const mainCanvasRef = ref<HTMLCanvasElement | null>(null)

  // 离屏 Canvas
  const offscreenCanvas = document.createElement('canvas')
  const offCtx = offscreenCanvas.getContext('2d')!

  // 当前工具 & 样式
  const currentTool = ref<ToolType>('pen')
  const currentColor = ref('#000000')
  const currentLineWidth = ref(3)

  // 视图变换（缩放/平移）
  const view = ref<ViewTransform>({ scale: 1, offsetX: 0, offsetY: 0 })

  // 所有绘制指令
  const allActions = shallowRef<DrawAction[]>([])

  // 撤销 / 重做栈
  const undoStack = ref<DrawAction[]>([])
  const redoStack = ref<DrawAction[]>([])

  // 绘制状态
  let isDrawing = false
  let startPoint: Point | null = null
  let currentPoints: Point[] = []
  // 平移拖拽状态
  let isPanning = false
  let lastPanPoint: Point | null = null

  // 异步重绘控制
  let rafId: number | null = null
  let needRedraw = false

  // 文本工具回调（外部注入）
  let showTextInput: ((point: Point) => void) | null = null

  const canUndo = ref(false)
  const canRedo = ref(false)

  function updateUndoRedoState() {
    canUndo.value = undoStack.value.length > 0
    canRedo.value = redoStack.value.length > 0
  }

  // ---------- 坐标转换（屏幕 ↔ 画布）----------
  function screenToCanvas(screenX: number, screenY: number): Point {
    const { scale, offsetX, offsetY } = view.value
    return {
      x: (screenX - offsetX) / scale,
      y: (screenY - offsetY) / scale,
    }
  }

  function canvasToScreen(canvasX: number, canvasY: number): Point {
    const { scale, offsetX, offsetY } = view.value
    return {
      x: canvasX * scale + offsetX,
      y: canvasY * scale + offsetY,
    }
  }

  // 从事件获取屏幕坐标（相对于 Canvas 元素）
  function getCanvasPoint(e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement): Point {
    const rect = canvas.getBoundingClientRect()
    const clientX = (e as TouchEvent).touches
      ? (e as TouchEvent).touches[0].clientX
      : (e as MouseEvent).clientX
    const clientY = (e as TouchEvent).touches
      ? (e as TouchEvent).touches[0].clientY
      : (e as MouseEvent).clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
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

  // 窗口尺寸变化（只影响硬件像素，缩放状态不变）
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

  // ---------- 渲染全部指令到离屏（应用缩放与平移）----------
  function renderAllToOffscreen() {
    if (!offscreenCanvas.width || !offscreenCanvas.height) return
    const ctx = offCtx
    ctx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height)

    ctx.save()
    // 应用视图变换
    ctx.translate(view.value.offsetX, view.value.offsetY)
    ctx.scale(view.value.scale, view.value.scale)

    for (const action of allActions.value) {
      drawActionOnContext(ctx, action)
    }
    ctx.restore()
  }

  function drawActionOnContext(ctx: CanvasRenderingContext2D, action: DrawAction) {
    ctx.save()
    ctx.strokeStyle = action.color
    ctx.fillStyle = action.color
    ctx.lineWidth = action.lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    switch (action.tool) {
      case 'pen':
      case 'eraser': {
        const d = action.data as any
        const pts = d.points as Point[] | undefined
        if (pts && pts.length > 1) {
          ctx.beginPath()
          ctx.moveTo(pts[0].x, pts[0].y)
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
          if (action.tool === 'eraser') {
            // 橡皮擦：用背景色绘制（全局组合为正常）
            ctx.globalCompositeOperation = 'source-over'
            ctx.strokeStyle = '#ffffff'
            ctx.lineWidth = action.lineWidth * 2 // 稍粗一点，擦得更干净
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
        const d = action.data as TextData
        ctx.font = `${action.lineWidth * 5}px sans-serif`
        ctx.fillText(d.text, d.x, d.y)
        break
      }
    }
    ctx.restore()
  }

  // 将离屏内容绘制到主 Canvas（只应用 CSS 缩放时的显示）
  function flushToMainCanvas() {
    const main = mainCanvasRef.value
    if (!main) return
    const ctx = main.getContext('2d')!
    ctx.clearRect(0, 0, main.width, main.height)
    ctx.drawImage(offscreenCanvas, 0, 0)
  }

  function requestRedraw() {
    console.trace('requestRedraw 被调用')
    needRedraw = true
    if (rafId) return
    rafId = requestAnimationFrame(() => {
      renderAllToOffscreen()
      flushToMainCanvas()
      rafId = null
      needRedraw = false
    })
  }

  // ---------- 历史栈 ----------
  function pushAction(action: DrawAction, isLocal: boolean) {
    allActions.value = [...allActions.value, action]
    if (isLocal) {
      undoStack.value.push(action)
      redoStack.value = []
    }
    updateUndoRedoState()
    requestRedraw()
  }

  function removeActionById(id: string) {
    allActions.value = allActions.value.filter((a) => a.id !== id)
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


  // ---------- 鼠标/触摸事件（适配缩放和平移）----------
  function onPointerDown(e: MouseEvent | TouchEvent) {
    e.preventDefault()
    const canvas = mainCanvasRef.value!
    const screenPoint = getCanvasPoint(e, canvas)

    // 右键或中键：开始平移
    if ((e as MouseEvent).button === 1 || (e as MouseEvent).button === 2) {
      isPanning = true
      lastPanPoint = screenPoint
      return
    }

      // 文本工具 → 弹出输入框
    if (currentTool.value === 'text') {
     showTextInput?.(screenToCanvas(screenPoint.x, screenPoint.y))
     return
    }

    isDrawing = true
    const canvasPoint = screenToCanvas(screenPoint.x, screenPoint.y)
    startPoint = canvasPoint
    currentPoints = [canvasPoint]
  }

  function onPointerMove(e: MouseEvent | TouchEvent) {
    e.preventDefault()
    const canvas = mainCanvasRef.value!
    const screenPoint = getCanvasPoint(e, canvas)

    // 处理平移
    if (isPanning && lastPanPoint) {
      const dx = screenPoint.x - lastPanPoint.x
      const dy = screenPoint.y - lastPanPoint.y
      view.value = {
        ...view.value,
        offsetX: view.value.offsetX + dx,
        offsetY: view.value.offsetY + dy,
      }
      lastPanPoint = screenPoint
      requestRedraw()
      return
    }

    console.log('move event, isDrawing=', isDrawing)  // 临时日志
    if (!isDrawing) return

    const canvasPoint = screenToCanvas(screenPoint.x, screenPoint.y)
    const ctx = canvas.getContext('2d')!

    // 预览绘制在主 Canvas 上：先绘制离屏内容（包含历史），再叠加当前预览
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(offscreenCanvas, 0, 0)

    ctx.save()
    // 预览也应用视图变换
    ctx.translate(view.value.offsetX, view.value.offsetY)
    ctx.scale(view.value.scale, view.value.scale)

    ctx.strokeStyle = currentTool.value === 'eraser' ? '#ffffff' : currentColor.value
    ctx.lineWidth = currentLineWidth.value
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    switch (currentTool.value) {
      case 'pen':
      case 'eraser': {
        ctx.beginPath()
        ctx.moveTo(currentPoints[currentPoints.length - 1].x, currentPoints[currentPoints.length - 1].y)
        ctx.lineTo(canvasPoint.x, canvasPoint.y)
        ctx.stroke()
        currentPoints.push(canvasPoint)
        break
      }
      case 'rect': {
        const x = Math.min(startPoint!.x, canvasPoint.x)
        const y = Math.min(startPoint!.y, canvasPoint.y)
        const w = Math.abs(canvasPoint.x - startPoint!.x)
        const h = Math.abs(canvasPoint.y - startPoint!.y)
        ctx.strokeRect(x, y, w, h)
        break
      }
      case 'circle': {
        const dx = canvasPoint.x - startPoint!.x
        const dy = canvasPoint.y - startPoint!.y
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
    const canvas = mainCanvasRef.value!

    if (isPanning) {
      isPanning = false
      lastPanPoint = null
      return null
    }

    if (!isDrawing) return null
    isDrawing = false

    const screenPoint = getCanvasPoint(e, canvas)
    const canvasPoint = screenToCanvas(screenPoint.x, screenPoint.y)

    let action: DrawAction | null = null

    switch (currentTool.value) {
      case 'pen':
      case 'eraser': {
        if (currentPoints.length > 1) {
          action = {
            id: generateId(),
            userId,
            tool: currentTool.value,
            color: currentColor.value,
            lineWidth: currentLineWidth.value,
            data: { points: [...currentPoints] },
          }
        }
        break
      }
      case 'rect': {
        const x = Math.min(startPoint!.x, canvasPoint.x)
        const y = Math.min(startPoint!.y, canvasPoint.y)
        const w = Math.abs(canvasPoint.x - startPoint!.x)
        const h = Math.abs(canvasPoint.y - startPoint!.y)
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
        const dx = canvasPoint.x - startPoint!.x
        const dy = canvasPoint.y - startPoint!.y
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
      pushAction(action, true)
    }
    requestRedraw()
    return action
  }

  // 鼠标滚轮缩放
  function onWheel(e: WheelEvent) {
    e.preventDefault()
    const canvas = mainCanvasRef.value!
    const screenPoint = getCanvasPoint(e, canvas)
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.min(10, Math.max(0.1, view.value.scale * delta))

    // 以鼠标位置为中心缩放
    const worldX = (screenPoint.x - view.value.offsetX) / view.value.scale
    const worldY = (screenPoint.y - view.value.offsetY) / view.value.scale

    view.value = {
      scale: newScale,
      offsetX: screenPoint.x - worldX * newScale,
      offsetY: screenPoint.y - worldY * newScale,
    }
    requestRedraw()
  }

  // ---------- 外部文本方法 ----------
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

  // ---------- API ----------
  function setColor(color: string) {
    currentColor.value = color
    
    if (currentTool.value === 'eraser') {
    currentColor.value = '#ffffff'
    return
    }
  }
  function setLineWidth(w: number) { currentLineWidth.value = w }
  function setTool(tool: ToolType) {
    if (tool === 'eraser') {
      currentTool.value = 'eraser'
      currentColor.value = '#ffffff'
      return
    }
    currentTool.value = tool
    if (currentColor.value === '#ffffff') currentColor.value = '#000000'
  }
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
  function drawRemote(action: DrawAction) {
    // 兼容旧版消息格式：将 points: number[][] 转为 PenData
    if ((action as any).points && !(action as any).data) {
      const pts = normalizeOldPoints((action as any).points)
      if (pts) {
        action = { ...action, data: { points: pts } }
      }
    }
    pushAction(action, false)
  }
  function registerTextInput(fn: (point: Point) => void) {
    showTextInput = fn
  }

  // 暴露视图状态供快捷键/UI使用
  function getView() { return view }

  return {
    mainCanvasRef,
    canUndo,
    canRedo,
    currentColor,
    currentLineWidth,
    currentTool,
    view,
    initCanvas,
    handleResize,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
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
    pushAction,
    getView,
    screenToCanvas,

    requestRedraw,         // 暴露重绘
    zoomIn: () => {
      const newScale = Math.min(10, view.value.scale * 1.1);
      view.value = { ...view.value, scale: newScale };
      requestRedraw();
    },
    zoomOut: () => {
     const newScale = Math.max(0.1, view.value.scale * 0.9);
      view.value = { ...view.value, scale: newScale };
      requestRedraw();
    },
  }
}