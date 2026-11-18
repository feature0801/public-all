/**
 * 공통 HTTP 클라이언트 (fetch 기반)
 * - baseURL, JSON 직렬화, 쿼리 파라미터, 에러 변환을 한 곳에서 처리
 * - 인증 토큰 / 공통 헤더 / 401 처리 등은 request() 안에 추가
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

/** mock 사용 여부 (.env 의 VITE_USE_MOCK) */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export class ApiError extends Error {
  readonly status: number
  readonly data: unknown

  constructor(status: number, message: string, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

type Params = Record<string, string | number | boolean | undefined | null>

interface RequestOptions {
  params?: Params
  body?: unknown
  headers?: Record<string, string>
  signal?: AbortSignal
}

function buildUrl(url: string, params?: Params): string {
  const query = new URLSearchParams()
  Object.entries(params ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null) query.append(k, String(v))
  })
  const qs = query.toString()
  return `${BASE_URL}${url}${qs ? `?${qs}` : ''}`
}

async function request<T>(method: string, url: string, options: RequestOptions = {}): Promise<T> {
  const res = await fetch(buildUrl(url, options.params), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  })

  const text = await res.text()
  const data: unknown = text ? JSON.parse(text) : undefined

  if (!res.ok) {
    const message = (data as { message?: string } | undefined)?.message ?? `요청 실패 (${res.status})`
    throw new ApiError(res.status, message, data)
  }
  return data as T
}

export const http = {
  get: <T>(url: string, params?: Params, options?: Omit<RequestOptions, 'params'>) =>
    request<T>('GET', url, { ...options, params }),
  post: <T>(url: string, body?: unknown, options?: Omit<RequestOptions, 'body'>) =>
    request<T>('POST', url, { ...options, body }),
  put: <T>(url: string, body?: unknown, options?: Omit<RequestOptions, 'body'>) =>
    request<T>('PUT', url, { ...options, body }),
  delete: <T>(url: string, options?: RequestOptions) => request<T>('DELETE', url, options),
}
