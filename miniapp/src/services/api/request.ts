import Taro from '@tarojs/taro'

export type ApiParams = Record<string, string | string[] | number | number[] | undefined>

type ApiResponse<T> = {
  code: number
  data: T
  msg: string
}

/** 后端 API 基础地址，对应 web 端 Next.js 代理中的 API_BASE_URL */
const API_BASE_URL = process.env.TARO_APP_API_BASE_URL || 'http://127.0.0.1:8080'

/**
 * 将相对路径转为完整的后端 API 地址。
 * 等价于 web 端 route.ts 中的代理逻辑：
 *   `${apiBaseUrl}/api/${path}${search}`
 */
export function resolveUrl(apiPath: string): string {
  const base = API_BASE_URL.replace(/\/+$/, '')
  return `${base}${apiPath}`
}

export function compactApiParams(params: ApiParams) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) =>
        value !== '' &&
        value !== undefined &&
        (!Array.isArray(value) || value.length > 0)
    )
  ) as ApiParams
}

export function serializeApiParams(params?: ApiParams) {
  const queryParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined) continue
    if (Array.isArray(value))
      value.forEach((item) => queryParams.append(key, String(item)))
    else queryParams.set(key, String(value))
  }
  return queryParams
}

export async function apiGet<T>(
  url: string,
  params?: ApiParams,
  token?: string
) {
  return apiRequest<T>({
    url,
    method: 'GET',
    params: params || undefined,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
}

export async function apiPost<T>(
  url: string,
  body?: unknown,
  token?: string
) {
  return apiRequest<T>({
    url,
    method: 'POST',
    data: body ?? {},
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
}

export async function apiDelete<T>(url: string, token?: string) {
  return apiRequest<T>({
    url,
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
}

async function apiRequest<T>(config: {
  url: string
  method: 'GET' | 'POST' | 'DELETE'
  params?: ApiParams
  data?: unknown
  headers?: Record<string, string>
}) {
  const queryString =
    config.params && Object.keys(config.params).length > 0
      ? '?' + serializeApiParams(config.params).toString()
      : ''

  let response
  try {
    response = await Taro.request<ApiResponse<T>>({
      url: resolveUrl(config.url) + queryString,
      method: config.method,
      data: config.data,
      header: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    })
  } catch {
    throw new Error('接口连接失败，请确认后端服务已启动')
  }

  const result = response.data
  if (!result || typeof result !== 'object') {
    throw new Error(
      response.statusCode === 404
        ? '接口不存在，请确认后端服务已启动'
        : '接口返回异常，请稍后重试'
    )
  }

  const payload = result as ApiResponse<T>
  if (response.statusCode < 200 || response.statusCode >= 300 || payload.code !== 0) {
    throw new Error(payload.msg || '请求失败')
  }

  return payload.data
}
