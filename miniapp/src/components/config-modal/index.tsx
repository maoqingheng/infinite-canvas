import { useState } from 'react'
import { View, Text, Input } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { fetchImageModels } from '../../services/api/image'
import {
  useConfigStore,
  useEffectiveConfig,
  type AiConfig,
} from '../../stores/use-config-store'
import { ModelPicker } from '../model-picker'
import { cn } from '../../utils/cn'
import './index.scss'

export function ConfigModal() {
  const [loadingModels, setLoadingModels] = useState(false)
  const config = useConfigStore((state) => state.config)
  const updateConfig = useConfigStore((state) => state.updateConfig)
  const isConfigOpen = useConfigStore((state) => state.isConfigOpen)
  const shouldPromptContinue = useConfigStore(
    (state) => state.shouldPromptContinue
  )
  const setConfigDialogOpen = useConfigStore(
    (state) => state.setConfigDialogOpen
  )
  const clearPromptContinue = useConfigStore(
    (state) => state.clearPromptContinue
  )
  const publicSettings = useConfigStore((state) => state.publicSettings)
  const effectiveConfig = useEffectiveConfig()
  const modelChannel = publicSettings?.modelChannel
  const allowCustomChannel = modelChannel?.allowCustomChannel === true
  const effectiveMode = allowCustomChannel ? config.channelMode : 'remote'
  const modelConfig = effectiveMode === 'remote' ? effectiveConfig : config

  const showToast = (title: string, icon: 'success' | 'none' = 'success') => {
    Taro.showToast({ title, icon, duration: 2000 })
  }

  const finishConfig = () => {
    setConfigDialogOpen(false)
    if (
      effectiveMode === 'local' &&
      (!config.baseUrl.trim() || !config.apiKey.trim())
    )
      return
    if (
      !modelConfig.imageModel.trim() ||
      !modelConfig.videoModel.trim() ||
      !modelConfig.textModel.trim()
    )
      return
    if (!allowCustomChannel && config.channelMode !== 'remote') {
      updateConfig('channelMode', 'remote')
    }
    showToast(
      shouldPromptContinue ? '配置已保存，请继续刚才的请求' : '配置已保存'
    )
    clearPromptContinue()
  }

  const refreshModels = async () => {
    if (effectiveMode === 'remote') return
    if (!config.baseUrl.trim() || !config.apiKey.trim()) {
      showToast('请先填写 Base URL 和 API Key', 'none')
      return
    }
    setLoadingModels(true)
    try {
      const models = await fetchImageModels(config)
      updateConfig('models', models)
      if (models.length && !models.includes(config.imageModel))
        updateConfig('imageModel', models[0])
      if (models.length && !models.includes(config.videoModel))
        updateConfig('videoModel', models[0])
      if (models.length && !models.includes(config.textModel))
        updateConfig('textModel', models[0])
      showToast('模型列表已更新')
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : '读取模型失败',
        'none'
      )
    } finally {
      setLoadingModels(false)
    }
  }

  if (!isConfigOpen) return null

  return (
    <View className="config-modal-mask" onClick={() => setConfigDialogOpen(false)}>
      <View className="config-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <View className="config-modal-header">
          <View>
            <Text className="config-modal-title">配置</Text>
            <Text className="config-modal-subtitle">模型和密钥</Text>
          </View>
          <View
            className="config-modal-close"
            onClick={() => setConfigDialogOpen(false)}
          >
            <Text>✕</Text>
          </View>
        </View>

        {/* Body */}
        <View className="config-modal-body">
          {/* Channel Mode Switch */}
          {allowCustomChannel && (
            <View className="config-field">
              <Text className="config-label">渠道模式</Text>
              <View className="config-segmented">
                <View
                  className={cn(
                    'segmented-item',
                    effectiveMode === 'local' && 'segmented-item-active'
                  )}
                  onClick={() => updateConfig('channelMode', 'local')}
                >
                  <Text>本地直连</Text>
                </View>
                <View
                  className={cn(
                    'segmented-item',
                    effectiveMode === 'remote' && 'segmented-item-active'
                  )}
                  onClick={() => updateConfig('channelMode', 'remote')}
                >
                  <Text>云端渠道</Text>
                </View>
              </View>
            </View>
          )}

          {/* Local Mode Fields */}
          {effectiveMode === 'local' ? (
            <>
              <View className="config-field-row">
                <View className="config-field config-field-half">
                  <Text className="config-label">Base URL</Text>
                  <Input
                    className="config-input"
                    value={config.baseUrl}
                    placeholder="https://api.openai.com"
                    onInput={(e) =>
                      updateConfig('baseUrl', e.detail.value)
                    }
                  />
                </View>
                <View className="config-field config-field-half">
                  <Text className="config-label">API Key</Text>
                  <Input
                    className="config-input"
                    password
                    value={config.apiKey}
                    placeholder="sk-..."
                    onInput={(e) =>
                      updateConfig('apiKey', e.detail.value)
                    }
                  />
                </View>
              </View>

              <View className="config-models-bar">
                <View className="config-models-info">
                  <Text className="config-models-title">模型列表</Text>
                  <Text className="config-models-count">
                    当前已保存 {config.models.length} 个模型
                  </Text>
                </View>
                <View
                  className={cn(
                    'config-models-btn',
                    loadingModels && 'config-models-btn-loading'
                  )}
                  onClick={loadingModels ? undefined : () => void refreshModels()}
                >
                  <Text>{loadingModels ? '拉取中...' : '拉取模型列表'}</Text>
                </View>
              </View>
            </>
          ) : (
            <View className="config-remote-info">
              <Text className="config-remote-info-title">云端渠道</Text>
              <Text className="config-remote-info-desc">
                由系统后台渠道转发请求，当前可用{' '}
                {modelChannel?.availableModels.length || 0} 个模型。
              </Text>
            </View>
          )}

          {/* Model Pickers */}
          <View className="config-model-pickers">
            <View className="config-field">
              <Text className="config-label">默认生图模型</Text>
              <ModelPicker
                config={modelConfig}
                value={modelConfig.imageModel}
                onChange={(model) => updateConfig('imageModel', model)}
                fullWidth
              />
            </View>
            <View className="config-field">
              <Text className="config-label">默认视频模型</Text>
              <ModelPicker
                config={modelConfig}
                value={modelConfig.videoModel}
                onChange={(model) => updateConfig('videoModel', model)}
                fullWidth
              />
            </View>
            <View className="config-field">
              <Text className="config-label">默认文本模型</Text>
              <ModelPicker
                config={modelConfig}
                value={modelConfig.textModel}
                onChange={(model) => updateConfig('textModel', model)}
                fullWidth
              />
            </View>
          </View>

          {/* System Prompt (local only) */}
          {effectiveMode === 'local' && (
            <View className="config-field">
              <Text className="config-label">系统提示词</Text>
              <Input
                className="config-textarea"
                value={config.systemPrompt}
                placeholder="例如：你是一位擅长电影感写实摄影的视觉导演。"
                onInput={(e) =>
                  updateConfig('systemPrompt', e.detail.value)
                }
              />
            </View>
          )}
        </View>

        {/* Footer */}
        <View className="config-modal-footer">
          <View className="config-finish-btn" onClick={finishConfig}>
            <Text>完成</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
