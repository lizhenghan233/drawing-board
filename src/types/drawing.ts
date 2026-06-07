// src/types/drawing.ts

// 工具类型（新增 eraser）
export type ToolType = 'pen' | 'rect' | 'circle' | 'text' | 'eraser'

// 坐标点
export interface Point {
  x: number
  y: number
}

// ---- 每种工具的独立数据接口 ----
export interface PenData {
  points: Point[]
}

export interface RectData {
  x: number
  y: number
  width: number
  height: number
}

export interface CircleData {
  cx: number
  cy: number
  radius: number
}

export interface TextData {
  text: string
  x: number
  y: number
}

export interface EraserData {
  points: Point[]
}

// ---- 统一的绘图操作（所有地方都使用这个） ----
export interface DrawAction {
  id: string
  userId: number
  tool: ToolType
  color: string
  lineWidth: number
  data: PenData | RectData | CircleData | TextData | EraserData
}

// 兼容旧版（如果你的后端或别的组件还在用 DrawingData，它就是 DrawAction）
export type DrawingData = DrawAction

// ---------- 缩放状态 ----------
export interface ViewTransform {
  scale: number
  offsetX: number
  offsetY: number
}