// src/api/request.ts
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

interface RequestOptions extends RequestInit {
  showError?: boolean
}

export async function request<T = unknown>(url: string, options: RequestOptions = {}): Promise<T> {
  const { showError = true, ...fetchOptions } = options
  try {
    const response = await fetch(`${API_BASE}${url}`, fetchOptions)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    const data = await response.json()
    return data as T
  } catch (error) {
    if (showError) {
      const { showToast } = await import('@/composables/useToast')
      showToast(error instanceof Error ? error.message : '网络请求失败', 'error')
    }
    throw error // 抛出异常，让上层处理
  }
}

export function get<T = unknown>(url: string, options?: RequestOptions) {
  return request<T>(url, { ...options, method: 'GET' })
}

export function post<T = unknown>(url: string, data?: unknown, options?: RequestOptions) {
  return request<T>(url, {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: data ? JSON.stringify(data) : undefined,
  })
}
