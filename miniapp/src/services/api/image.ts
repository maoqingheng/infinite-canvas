import Taro from '@tarojs/taro'
import { buildApiUrl, type AiConfig } from '../../stores/use-config-store'
import { useUserStore } from '../../stores/use-user-store'
import { resolveUrl } from './request'

export type ChatCompletionMessage = {
  role: 'system' | 'user' | 'assistant'
  content:
    | string
    | Array<
        | { type: 'text'; text: string }
        | { type: 'image_url'; image_url: { url: string } }
      >
}

type ImageApiResponse = {
  data?: Array<Record<string, unknown>>
  error?: { message?: string }
  code?: number
  msg?: string
}

const QUALITY_BASE: Record<string, number> = {
  low: 1024,
  medium: 2048,
  high: 2880,
}

function resolveSize(
  quality: string,
  ratio: string
): string | undefined {
  const basePixels = QUALITY_BASE[quality]
  if (!basePixels || ratio === 'auto' || !ratio) return undefined

  const parts = ratio.split(':')
  if (parts.length !== 2) return undefined
  const w = Number(parts[0])
  const h = Number(parts[1])
  if (!w || !h) return undefined

  const targetPixels = basePixels * basePixels
  const isLandscape = w >= h
  const longRatio = isLandscape ? w / h : h / w

  const longSideRaw = Math.sqrt(targetPixels * longRatio)
  const longSide = Math.floor(longSideRaw / 16) * 16
  const shortSide = Math.round((longSide / longRatio) / 16) * 16

  const width = isLandscape ? longSide : shortSide
  const height = isLandscape ? shortSide : longSide

  return `${width}x${height}`
}

function resolveImageDataUrl(item: Record<string, unknown>) {
  if (typeof item.b64_json === 'string' && item.b64_json) {
    return `data:image/png;base64,${item.b64_json}`
  }
  if (typeof item.url === 'string' && item.url) {
    return item.url
  }
  return null
}

function parseImagePayload(payload: ImageApiResponse) {
  if (typeof payload.code === 'number' && payload.code !== 0) {
    throw new Error(payload.msg || '请求失败')
  }
  const images =
    payload.data
      ?.map(resolveImageDataUrl)
      .filter((value): value is string => Boolean(value))
      .map((dataUrl) => ({ id: `${Date.now()}-${Math.random()}`, dataUrl })) || []

  if (images.length === 0) {
    throw new Error('接口没有返回图片')
  }

  return images
}

function readRequestError(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  return fallback
}

function withSystemPrompt(config: AiConfig, prompt: string) {
  const systemPrompt = config.systemPrompt.trim()
  return systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt
}

function aiApiUrl(config: AiConfig, path: string) {
  return config.channelMode === 'remote'
    ? resolveUrl(`/api/v1${path}`)
    : buildApiUrl(config.baseUrl, path)
}

function aiHeaders(config: AiConfig): Record<string, string> {
  const token = useUserStore.getState().token
  return config.channelMode === 'remote'
    ? { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    : { Authorization: `Bearer ${config.apiKey}` }
}

function refreshRemoteUser(config: AiConfig) {
  if (config.channelMode === 'remote')
    void useUserStore.getState().hydrateUser()
}

export async function requestGeneration(
  config: AiConfig,
  prompt: string
) {
  const n = Math.max(1, Math.min(15, Math.floor(Math.abs(Number(config.count)) || 1)))
  const pixelSize = resolveSize(config.quality, config.size)
  try {
    const response = await Taro.request<ImageApiResponse>({
      url: aiApiUrl(config, '/images/generations'),
      method: 'POST',
      header: { ...aiHeaders(config), 'Content-Type': 'application/json' },
      data: {
        model: config.model,
        prompt: withSystemPrompt(config, prompt),
        n,
        ...(pixelSize ? { quality: config.quality, size: pixelSize } : {}),
        response_format: 'b64_json',
      },
    })
    const images = parseImagePayload(response.data)
    refreshRemoteUser(config)
    return images
  } catch (error) {
    throw new Error(readRequestError(error, '请求失败'))
  }
}

export async function requestEdit(
  config: AiConfig,
  prompt: string,
  references: Array<{ dataUrl: string }>
) {
  const n = Math.max(1, Math.min(15, Math.floor(Math.abs(Number(config.count)) || 1)))
  const pixelSize = resolveSize(config.quality, config.size)
  try {
    const response = await Taro.request<ImageApiResponse>({
      url: aiApiUrl(config, '/images/edits'),
      method: 'POST',
      header: { ...aiHeaders(config), 'Content-Type': 'application/json' },
      data: {
        model: config.model,
        prompt: withSystemPrompt(config, prompt),
        n,
        ...(pixelSize ? { quality: config.quality, size: pixelSize } : {}),
        response_format: 'b64_json',
        image: references.map((ref) => ref.dataUrl),
      },
    })
    const images = parseImagePayload(response.data)
    refreshRemoteUser(config)
    return images
  } catch (error) {
    throw new Error(readRequestError(error, '请求失败'))
  }
}

export async function requestImageQuestion(
  config: AiConfig,
  messages: ChatCompletionMessage[],
  onDelta: (text: string) => void
) {
  const systemPrompt = config.systemPrompt.trim()
  const requestMessages = systemPrompt
    ? [{ role: 'system' as const, content: systemPrompt }, ...messages]
    : messages

  try {
    const response = await Taro.request<{
      choices?: Array<{ message?: { content?: string } }>
      code?: number
      msg?: string
    }>({
      url: aiApiUrl(config, '/chat/completions'),
      method: 'POST',
      header: { ...aiHeaders(config), 'Content-Type': 'application/json' },
      data: {
        model: config.model,
        messages: requestMessages,
        stream: false,
      },
    })

    const payload = response.data
    if (typeof payload.code === 'number' && payload.code !== 0) {
      throw new Error(payload.msg || '请求失败')
    }

    const answer = payload.choices?.[0]?.message?.content || '没有返回内容'
    onDelta(answer)
    refreshRemoteUser(config)
    return answer
  } catch (error) {
    throw new Error(readRequestError(error, '请求失败'))
  }
}

export async function fetchImageModels(config: AiConfig) {
  if (config.channelMode === 'remote') return config.models
  try {
    const response = await Taro.request<{
      data?: Array<{ id?: string }>
      error?: { message?: string }
    }>({
      url: buildApiUrl(config.baseUrl, '/models'),
      method: 'GET',
      header: { Authorization: `Bearer ${config.apiKey}` },
    })
    return (response.data.data || [])
      .map((model) => model.id)
      .filter((id): id is string => Boolean(id))
      .sort((a, b) => a.localeCompare(b))
  } catch (error) {
    throw new Error(readRequestError(error, '读取模型失败'))
  }
}
