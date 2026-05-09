// src/types/drawing.ts

// 工具类型
export type ToolType = 'pen' | 'rect' | 'circle' | 'text'

// 坐标点
export interface Point {
  x: number
  y: number
}

// 不同工具的结构化数据
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

// 统一的绘图操作对象（历史记录 & WebSocket 传输都使用它）
export interface DrawAction {
  id: string
  userId: number
  tool: ToolType
  color: string
  lineWidth: number
  data: PenData | RectData | CircleData | TextData
}

// 兼容旧接口（如果你在别处使用了 DrawingData，它会变成 Deprecated，我们不再用它）
// 为了不报错，保留一个别名，实际上现在应该都用 DrawAction
export type DrawingData = DrawAction