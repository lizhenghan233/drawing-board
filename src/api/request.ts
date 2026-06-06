const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081'

async function request<T>(url: string, options: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, options)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return response.json()
}

export async function get<T>(url: string, options?: RequestInit): Promise<T> {
  return request<T>(url, { ...options, method: 'GET' })
}

export async function post<T>(url: string, data?: unknown, options?: RequestInit): Promise<T> {
  return request<T>(url, {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: data ? JSON.stringify(data) : undefined,
  })
}
