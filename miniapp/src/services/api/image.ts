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

function compactText(value: string) {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function parseResponsePayload(data: ImageApiResponse | string) {
  return typeof data === 'string'
    ? (JSON.parse(data || '{}') as ImageApiResponse)
    : data
}

function responseErrorMessage(
  response: { statusCode?: number; data?: ImageApiResponse | string },
  fallback = '请求失败'
) {
  let payload: ImageApiResponse | null = null
  try {
    payload =
      response.data === undefined ? null : parseResponsePayload(response.data)
  } catch {
    const text =
      typeof response.data === 'string' ? compactText(response.data) : ''
    if (response.statusCode === 504 || /gateway time-out/i.test(text)) {
      return '网关超时 504：AI 服务响应时间过长，请稍后重试或减少生成张数'
    }
    return text ? text.slice(0, 300) : fallback
  }
  if (payload?.msg) return payload.msg
  if (payload?.error?.message) return payload.error.message
  return response.statusCode ? `${fallback}：${response.statusCode}` : fallback
}

function withSystemPrompt(config: AiConfig, prompt: string) {
  const systemPrompt = config.systemPrompt.trim()
  return systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt
}

function imageReferenceLabel(index: number) {
  return `图片${index + 1}`
}

function buildImageReferencePromptText(prompt: string, references: Array<unknown>) {
  const text = prompt.trim()
  if (!references.length) return text
  const labels = references.map((_, index) => imageReferenceLabel(index))
  return `参考图片编号：${labels.join('、')}。请按这些编号理解提示词中的图片引用。\n\n${text}`
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

async function resolveUploadFilePath(dataUrl: string) {
  if (/^https?:\/\//i.test(dataUrl)) {
    const response = await Taro.downloadFile({ url: dataUrl })
    if (response.statusCode >= 400 || !response.tempFilePath) {
      throw new Error('参考图下载失败')
    }
    return response.tempFilePath
  }
  if (dataUrl.startsWith('data:')) {
    const [, content = ''] = dataUrl.split(',', 2)
    const filePath = `${Taro.env.USER_DATA_PATH}/reference-${Date.now()}-${Math.random().toString(36).slice(2)}.png`
    Taro.getFileSystemManager().writeFileSync(filePath, content, 'base64')
    return filePath
  }
  return dataUrl
}

function encodeUtf8(value: string) {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(value)
  const encoded = unescape(encodeURIComponent(value))
  const bytes = new Uint8Array(encoded.length)
  for (let i = 0; i < encoded.length; i += 1) bytes[i] = encoded.charCodeAt(i)
  return bytes
}

function readFileBytes(filePath: string) {
  const data = Taro.getFileSystemManager().readFileSync(filePath)
  return typeof data === 'string' ? encodeUtf8(data) : new Uint8Array(data)
}

function concatBytes(parts: Uint8Array[]) {
  const length = parts.reduce((sum, part) => sum + part.length, 0)
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const part of parts) {
    bytes.set(part, offset)
    offset += part.length
  }
  return bytes.buffer
}

function guessImageMimeType(filePath: string, type?: string) {
  if (type?.startsWith('image/')) return type
  const ext = filePath.split('?')[0].split('#')[0].split('.').pop()?.toLowerCase()
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'gif') return 'image/gif'
  if (ext === 'bmp') return 'image/bmp'
  return 'image/png'
}

function uploadFileName(filePath: string, index: number) {
  const name = filePath.split('?')[0].split('#')[0].split('/').pop()
  return name && name.includes('.') ? name : `reference-${index + 1}.png`
}

async function buildMultipartImageBody(
  fields: Record<string, string>,
  references: Array<{ dataUrl: string; name?: string; type?: string }>
) {
  const boundary = `miniapp-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const parts: Uint8Array[] = []
  for (const [key, value] of Object.entries(fields)) {
    parts.push(
      encodeUtf8(
        `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`
      )
    )
  }
  const filePaths = await Promise.all(
    references.map((item) => resolveUploadFilePath(item.dataUrl))
  )
  filePaths.forEach((filePath, index) => {
    const reference = references[index]
    const filename = uploadFileName(filePath, index)
    parts.push(
      encodeUtf8(
        `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${filename}"\r\nContent-Type: ${guessImageMimeType(filePath, reference.type)}\r\n\r\n`
      )
    )
    parts.push(readFileBytes(filePath))
    parts.push(encodeUtf8('\r\n'))
  })
  parts.push(encodeUtf8(`--${boundary}--\r\n`))
  return {
    body: concatBytes(parts),
    contentType: `multipart/form-data; boundary=${boundary}`,
  }
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
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error(responseErrorMessage(response))
    }
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
  references: Array<{ dataUrl: string; name?: string; type?: string }>
) {
  const n = Math.max(1, Math.min(15, Math.floor(Math.abs(Number(config.count)) || 1)))
  const pixelSize = resolveSize(config.quality, config.size)
  const requestPrompt = buildImageReferencePromptText(prompt, references)
  try {
    const formData = {
      model: config.model,
      prompt: withSystemPrompt(config, requestPrompt),
      n: String(n),
      ...(pixelSize ? { quality: config.quality, size: pixelSize } : {}),
      response_format: 'b64_json',
    }
    const { body, contentType } = await buildMultipartImageBody(formData, references)
    const response = await Taro.request<ImageApiResponse | string>({
      url: aiApiUrl(config, '/images/edits'),
      method: 'POST',
      header: {
        ...aiHeaders(config),
        'Content-Type': contentType,
      },
      data: body,
      timeout: 180000,
    })
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error(responseErrorMessage(response))
    }
    const payload = parseResponsePayload(response.data)
    const images = parseImagePayload(payload)
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
