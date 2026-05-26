import { useState, useEffect } from 'react'
import { View, Text, Input, Image, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import {
  useConfigStore,
  useEffectiveConfig,
  type AiConfig,
} from '../../stores/use-config-store'
import { useAssetStore } from '../../stores/use-asset-store'
import { requestGeneration, requestEdit } from '../../services/api/image'
import { formatBytes, formatDuration } from '../../utils/format'
import { cn } from '../../utils/cn'
import { ConfigModal } from '../../components/config-modal'
import type { ReferenceImage } from '../../types'
import './index.scss'

type GeneratedImage = {
  id: string
  dataUrl: string
  durationMs: number
  width: number
  height: number
  bytes: number
}

type GenerationResult = {
  id: string
  status: 'pending' | 'success' | 'failed'
  image?: GeneratedImage
  error?: string
}

type GenerationLog = {
  id: string
  createdAt: number
  title: string
  time: string
  model: string
  durationMs: number
  successCount: number
  failCount: number
  imageCount: number
  size: string
  quality: string
  status: '成功' | '失败'
  thumbnails: string[]
}

const sizeOptions = [
  'auto', '1:1', '3:2', '2:3', '4:3', '3:4', '16:9', '9:16',
]
const qualityOptions = ['auto', 'low', 'medium', 'high']
const LOG_STORE_KEY = 'infinite-canvas:image_generation_logs'

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export default function ImagePage() {
  const config = useConfigStore((state) => state.config)
  const effectiveConfig = useEffectiveConfig()
  const updateConfig = useConfigStore((state) => state.updateConfig)
  const isAiConfigReady = useConfigStore((state) => state.isAiConfigReady)
  const openConfigDialog = useConfigStore((state) => state.openConfigDialog)
  const addAsset = useAssetStore((state) => state.addAsset)

  const [prompt, setPrompt] = useState('')
  const [references, setReferences] = useState<ReferenceImage[]>([])
  const [results, setResults] = useState<GenerationResult[]>([])
  const [logs, setLogs] = useState<GenerationLog[]>([])
  const [running, setRunning] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const [startedAt, setStartedAt] = useState(0)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [previewLog, setPreviewLog] = useState<GenerationLog | null>(null)
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([])
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const model = effectiveConfig.imageModel || effectiveConfig.model
  const canGenerate = Boolean(prompt.trim())
  const generationCount = Math.max(
    1,
    Math.min(10, Number(config.count) || 1)
  )

  // Timer
  useEffect(() => {
    if (!running || !startedAt) return
    const timer = setInterval(() => setElapsedMs(Date.now() - startedAt), 1000)
    return () => clearInterval(timer)
  }, [running, startedAt])

  // Load logs
  useEffect(() => {
    void refreshLogs()
  }, [])

  const refreshLogs = async () => {
    try {
      const res = await Taro.getStorage({ key: LOG_STORE_KEY })
      const items = JSON.parse(res.data) as GenerationLog[]
      setLogs(items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)))
    } catch {
      setLogs([])
    }
  }

  const saveLogs = async (items: GenerationLog[]) => {
    await Taro.setStorage({ key: LOG_STORE_KEY, data: JSON.stringify(items) })
  }

  const addReferences = async () => {
    try {
      const res = await Taro.chooseImage({
        count: 5,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
      })
      const newRefs: ReferenceImage[] = res.tempFiles.map((file, i) => ({
        id: generateId(),
        name: `image-${i + 1}`,
        type: 'image/*',
        dataUrl: file.path,
      }))
      setReferences((v) => [...v, ...newRefs])
    } catch {
      // user cancelled
    }
  }

  const removeReference = (id: string) => {
    setReferences((v) => v.filter((r) => r.id !== id))
  }

  const createSession = () => {
    setPrompt('')
    setReferences([])
    setResults([])
    setElapsedMs(0)
    setStartedAt(0)
    setPreviewLog(null)
  }

  const buildRequestSnapshot = () => {
    const text = prompt.trim()
    if (!text) {
      Taro.showToast({ title: '请输入生图提示词', icon: 'none' })
      return null
    }
    if (!isAiConfigReady(effectiveConfig, model)) {
      Taro.showToast({ title: '请先完成配置', icon: 'none' })
      openConfigDialog(true)
      return null
    }
    return {
      text,
      config: { ...effectiveConfig, model, count: '1' },
      references: [...references],
    }
  }

  const runGenerationSlot = async (
    index: number,
    snapshot: { text: string; config: AiConfig; references: ReferenceImage[] }
  ) => {
    const itemStartedAt = Date.now()
    try {
      const result =
        snapshot.references.length > 0
          ? await requestEdit(
              snapshot.config,
              snapshot.text,
              snapshot.references
            )
          : await requestGeneration(snapshot.config, snapshot.text)
      const image = result[0]
      if (!image) throw new Error('接口没有返回图片')
      const nextImage: GeneratedImage = {
        id: image.id,
        dataUrl: image.dataUrl,
        durationMs: Date.now() - itemStartedAt,
        width: 0,
        height: 0,
        bytes: 0,
      }
      setResults((v) =>
        v.map((item, i) =>
          i === index ? { status: 'success', id: item.id, image: nextImage } : item
        )
      )
      return nextImage
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : '生成失败'
      setResults((v) =>
        v.map((item, i) =>
          i === index
            ? { status: 'failed', id: item.id, error: errMsg }
            : item
        )
      )
      throw error
    }
  }

  const generate = async () => {
    const snapshot = buildRequestSnapshot()
    if (!snapshot) return

    setElapsedMs(0)
    setRunning(true)
    setPreviewLog(null)
    setResults(
      Array.from({ length: generationCount }, () => ({
        id: generateId(),
        status: 'pending' as const,
      }))
    )
    const batchStartedAt = Date.now()
    setStartedAt(batchStartedAt)

    const tasks = Array.from({ length: generationCount }, (_, i) =>
      runGenerationSlot(i, snapshot)
    )

    const settled = await Promise.allSettled(tasks)
    const successImages = settled
      .filter((s): s is PromiseFulfilledResult<GeneratedImage> => s.status === 'fulfilled')
      .map((s) => s.value)
    const successCount = successImages.length
    const failCount = generationCount - successCount

    const log: GenerationLog = {
      id: generateId(),
      createdAt: Date.now(),
      title: prompt.trim().slice(0, 12) || '未命名',
      time: new Date().toLocaleString('zh-CN', { hour12: false }),
      model,
      durationMs: Date.now() - batchStartedAt,
      successCount,
      failCount,
      imageCount: generationCount,
      size: effectiveConfig.size,
      quality: effectiveConfig.quality,
      status: successCount > 0 ? '成功' : '失败',
      thumbnails: successImages.map((img) => img.dataUrl),
    }

    const updatedLogs = [log, ...logs]
    setLogs(updatedLogs)
    await saveLogs(updatedLogs)

    if (successCount > 0) {
      Taro.showToast({ title: '图片已生成', icon: 'success' })
    } else {
      const failed = settled.find((s) => s.status === 'rejected')
      Taro.showToast({
        title:
          failed && failed.reason instanceof Error
            ? failed.reason.message
            : '生成失败',
        icon: 'none',
      })
    }

    setRunning(false)
  }

  const saveResultToAssets = (image: GeneratedImage) => {
    addAsset({
      kind: 'image',
      title: `生成结果`,
      coverUrl: image.dataUrl,
      tags: [],
      source: '生图工作台',
      data: {
        dataUrl: image.dataUrl,
        width: image.width,
        height: image.height,
        bytes: image.bytes,
        mimeType: 'image/png',
      },
      metadata: { source: 'image-page', prompt },
    })
    Taro.showToast({ title: '已加入我的素材', icon: 'success' })
  }

  const downloadImage = (image: GeneratedImage) => {
    Taro.saveImageToPhotosAlbum({
      filePath: image.dataUrl,
      success: () =>
        Taro.showToast({ title: '已保存到相册', icon: 'success' }),
      fail: () => Taro.showToast({ title: '保存失败', icon: 'none' }),
    })
  }

  const previewGenerationLog = (log: GenerationLog) => {
    setPreviewLog(log)
    setShowLogs(false)
    const images: GenerationResult[] = log.thumbnails.map((dataUrl, i) => ({
      id: `${log.id}-${i}`,
      status: 'success',
      image: {
        id: `${log.id}-${i}`,
        dataUrl,
        durationMs: log.durationMs,
        width: 0,
        height: 0,
        bytes: 0,
      },
    }))
    setResults(images)
  }

  const deleteSelectedLogs = async () => {
    const updated = logs.filter((l) => !selectedLogIds.includes(l.id))
    setLogs(updated)
    await saveLogs(updated)
    if (previewLog && selectedLogIds.includes(previewLog.id)) {
      setPreviewLog(null)
      setResults([])
    }
    setSelectedLogIds([])
    setDeleteConfirmOpen(false)
  }

  const toggleSelectLog = (id: string) => {
    setSelectedLogIds((ids) =>
      ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]
    )
  }

  return (
    <View className="image-page">
      <View className="image-layout">
        {/* Left Panel - Configuration */}
        <View className="config-panel">
          {/* Header */}
          <View className="panel-header">
            <Text className="panel-title">生图工作台</Text>
            <View className="panel-header-actions">
              <View
                className="header-action"
                onClick={() => setShowLogs(true)}
              >
                <Text>查看生图记录</Text>
              </View>
              <View
                className="header-action"
                onClick={() => setShowSettings(true)}
              >
                <Text>修改生图参数</Text>
              </View>
            </View>
          </View>

          {/* Prompt Input */}
          <View className="field">
            <View className="field-header">
              <Text className="field-label">提示词</Text>
            </View>
            <Input
              className="prompt-textarea"
              value={prompt}
              placeholder="描述画面主体、风格、构图、光线和用途"
              onInput={(e) => setPrompt(e.detail.value)}
            />
          </View>

          {/* Reference Images */}
          <View className="field">
            <View className="field-header">
              <Text className="field-label">参考图</Text>
              <View className="field-actions">
                <View className="field-action" onClick={addReferences}>
                  <Text>+ 上传</Text>
                </View>
              </View>
            </View>
            <ScrollView scrollX className="reference-list">
              <View className="reference-items">
                {references.map((ref) => (
                  <View key={ref.id} className="reference-item">
                    <Image
                      className="reference-img"
                      src={ref.dataUrl}
                      mode="aspectFill"
                    />
                    <View
                      className="reference-remove"
                      onClick={() => removeReference(ref.id)}
                    >
                      <Text>✕</Text>
                    </View>
                  </View>
                ))}
                {references.length === 0 && (
                  <View className="reference-empty">
                    <Text>暂无参考图</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>

          {/* Parameters Summary (mobile) */}
          <View className="params-summary">
            <Text className="params-summary-text">
              {model} · {effectiveConfig.size} · {effectiveConfig.quality}
            </Text>
          </View>

          {/* Generate Button */}
          <View className="generate-section">
            <View
              className={cn(
                'generate-btn',
                (!canGenerate || running) && 'generate-btn-disabled'
              )}
              onClick={canGenerate && !running ? () => { void generate() } : undefined}
            >
              <Text>{running ? '生成中...' : '开始生成'}</Text>
            </View>
          </View>
        </View>

        {/* Right Panel - Results */}
        <View className="results-panel">
          <View className="results-header">
            <Text className="results-title">生成结果</Text>
            {running && (
              <View className="results-timer">
                <Text>等待 {formatDuration(elapsedMs)}</Text>
              </View>
            )}
          </View>

          {results.length > 0 ? (
            <View className="results-grid">
              {results.map((result, index) =>
                result.status === 'success' && result.image ? (
                  <ResultCard
                    key={result.id}
                    image={result.image}
                    index={index}
                    onSave={() => saveResultToAssets(result.image!)}
                    onDownload={() => downloadImage(result.image!)}
                  />
                ) : result.status === 'failed' ? (
                  <FailedCard key={result.id} error={result.error || '生成失败'} />
                ) : (
                  <PendingCard key={result.id} />
                )
              )}
            </View>
          ) : (
            <View className="results-empty">
              <Text className="results-empty-text">还没有生成图片</Text>
            </View>
          )}
        </View>
      </View>

      {/* Settings Popup */}
      {showSettings && (
        <View className="popup-mask" onClick={() => setShowSettings(false)}>
          <View className="popup-content" onClick={(e) => e.stopPropagation()}>
            <View className="popup-header">
              <Text className="popup-title">生成参数</Text>
              <View
                className="popup-close"
                onClick={() => setShowSettings(false)}
              >
                <Text>✕</Text>
              </View>
            </View>

            <View className="settings-grid">
              <View className="setting-item">
                <Text className="setting-label">模型</Text>
                <Input
                  className="setting-input"
                  value={effectiveConfig.imageModel || effectiveConfig.model}
                  disabled
                />
              </View>
              <View className="setting-item">
                <Text className="setting-label">生成次数 (1-10)</Text>
                <Input
                  className="setting-input"
                  type="number"
                  value={config.count}
                  onInput={(e) =>
                    updateConfig(
                      'count',
                      String(Math.max(1, Math.min(10, Number(e.detail.value) || 1)))
                    )
                  }
                />
              </View>
              <View className="setting-item">
                <Text className="setting-label">尺寸</Text>
                <View className="chip-list">
                  {sizeOptions.map((s) => (
                    <View
                      key={s}
                      className={cn(
                        'chip',
                        config.size === s && 'chip-active'
                      )}
                      onClick={() => updateConfig('size', s)}
                    >
                      <Text>{s}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View className="setting-item">
                <Text className="setting-label">质量</Text>
                <View className="chip-list">
                  {qualityOptions.map((q) => (
                    <View
                      key={q}
                      className={cn(
                        'chip',
                        config.quality === q && 'chip-active'
                      )}
                      onClick={() => updateConfig('quality', q)}
                    >
                      <Text>{q}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Logs Popup */}
      {showLogs && (
        <View className="popup-mask" onClick={() => setShowLogs(false)}>
          <View className="popup-content" onClick={(e) => e.stopPropagation()}>
            <View className="popup-header">
              <Text className="popup-title">
                生成记录 ({logs.length})
              </Text>
              <View
                className="popup-close"
                onClick={() => setShowLogs(false)}
              >
                <Text>✕</Text>
              </View>
            </View>

            <View className="log-actions">
              <View className="log-action" onClick={createSession}>
                <Text>+ 新建</Text>
              </View>
              <View
                className="log-action"
                onClick={() =>
                  setSelectedLogIds(
                    selectedLogIds.length === logs.length
                      ? []
                      : logs.map((l) => l.id)
                  )
                }
              >
                <Text>
                  {selectedLogIds.length === logs.length
                    ? '取消全选'
                    : '全选'}
                </Text>
              </View>
              {selectedLogIds.length > 0 && (
                <View
                  className="log-action danger"
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  <Text>删除 ({selectedLogIds.length})</Text>
                </View>
              )}
            </View>

            <ScrollView scrollY className="logs-scroll">
              {logs.map((log) => (
                <View
                  key={log.id}
                  className={cn(
                    'log-item',
                    selectedLogIds.includes(log.id) && 'log-item-selected',
                    previewLog?.id === log.id && 'log-item-active'
                  )}
                >
                  <View
                    className="log-item-main"
                    onClick={() => previewGenerationLog(log)}
                  >
                    <View className="log-item-left">
                      <View
                        className={cn(
                          'log-checkbox',
                          selectedLogIds.includes(log.id) && 'checked'
                        )}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleSelectLog(log.id)
                        }}
                      >
                        {selectedLogIds.includes(log.id) && (
                          <Text>✓</Text>
                        )}
                      </View>
                      <View className="log-info">
                        <Text className="log-title">{log.title}</Text>
                        <View className="log-stats">
                          <View className="log-stat">
                            <Text>
                              成功 {log.successCount}
                            </Text>
                          </View>
                          {log.failCount > 0 && (
                            <View className="log-stat log-stat-fail">
                              <Text>
                                失败 {log.failCount}
                              </Text>
                            </View>
                          )}
                          <View className="log-stat">
                            <Text>{log.imageCount} 张</Text>
                          </View>
                          <View className="log-stat">
                            <Text>
                              {formatDuration(log.durationMs)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    <Text className="log-time">{log.time}</Text>
                  </View>
                  {log.thumbnails.length > 0 && (
                    <View className="log-thumbnails">
                      {log.thumbnails.slice(0, 4).map((thumb, i) => (
                        <Image
                          key={`${log.id}-${i}`}
                          className="log-thumb"
                          src={thumb}
                          mode="aspectFill"
                        />
                      ))}
                    </View>
                  )}
                </View>
              ))}
              {logs.length === 0 && (
                <View className="logs-empty">
                  <Text>暂无生成记录</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Delete Confirm */}
      {deleteConfirmOpen && (
        <View className="popup-mask" onClick={() => setDeleteConfirmOpen(false)}>
          <View className="popup-content confirm-popup" onClick={(e) => e.stopPropagation()}>
            <Text className="confirm-text">
              确定删除选中的 {selectedLogIds.length} 条生成记录吗？
            </Text>
            <View className="popup-actions">
              <View
                className="popup-btn"
                onClick={() => setDeleteConfirmOpen(false)}
              >
                <Text>取消</Text>
              </View>
              <View className="popup-btn danger" onClick={() => void deleteSelectedLogs()}>
                <Text>删除</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* AI Config Modal */}
      <ConfigModal />
      <View className="back-home" onClick={() => Taro.navigateTo({ url: '/pages/index/index' })}>
        <Text>←</Text>
      </View>
    </View>
  )
}

function ResultCard({
  image,
  index,
  onSave,
  onDownload,
}: {
  image: GeneratedImage
  index: number
  onSave: () => void
  onDownload: () => void
}) {
  return (
    <View className="result-card">
      <Image
        className="result-img"
        src={image.dataUrl}
        mode="aspectFill"
      />
      <View className="result-info">
        <Text className="result-name">结果 {index + 1}</Text>
        <Text className="result-meta">{formatDuration(image.durationMs)}</Text>
      </View>
      <View className="result-actions">
        <View className="result-action" onClick={onSave}>
          <Text>加入素材</Text>
        </View>
        <View className="result-action" onClick={onDownload}>
          <Text>下载</Text>
        </View>
      </View>
    </View>
  )
}

function FailedCard({ error }: { error: string }) {
  return (
    <View className="result-card failed">
      <View className="failed-content">
        <Text className="failed-title">生成失败</Text>
        <Text className="failed-error">{error}</Text>
      </View>
    </View>
  )
}

function PendingCard() {
  return (
    <View className="result-card pending">
      <View className="pending-content">
        <Text className="pending-text">生成中...</Text>
      </View>
    </View>
  )
}
