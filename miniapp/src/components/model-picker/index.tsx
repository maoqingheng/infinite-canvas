import { useMemo, useState } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import { cn } from '../../utils/cn'
import type { AiConfig } from '../../stores/use-config-store'
import './index.scss'

type ModelPickerProps = {
  config: AiConfig
  value?: string
  onChange: (model: string) => void
  fullWidth?: boolean
  onMissingConfig?: () => void
}

export function ModelPicker({
  config,
  value,
  onChange,
  fullWidth = false,
  onMissingConfig,
}: ModelPickerProps) {
  const [open, setOpen] = useState(false)
  const options = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...(config.channelMode === 'local' ? [value] : []),
            ...config.models,
          ].filter(Boolean)
        )
      ) as string[],
    [config.channelMode, config.models, value]
  )
  const current = value || ''

  const handleOpen = () => {
    if (!options.length && config.channelMode === 'local') {
      onMissingConfig?.()
      return
    }
    setOpen(!open)
  }

  const handleSelect = (model: string) => {
    onChange(model)
    setOpen(false)
  }

  return (
    <View className={cn('model-picker', fullWidth && 'model-picker-full')}>
      <View className="model-picker-trigger" onClick={handleOpen}>
        <Text className="model-picker-text">
          {current || '选择模型'}
        </Text>
        <Text className="model-picker-arrow">▼</Text>
      </View>

      {open && (
        <View className="model-picker-dropdown-mask" onClick={() => setOpen(false)}>
          <View className="model-picker-dropdown" onClick={(e) => e.stopPropagation()}>
            <ScrollView scrollY className="model-picker-list">
              {options.length > 0 ? (
                options.map((model) => (
                  <View
                    key={model}
                    className={cn(
                      'model-picker-item',
                      model === current && 'model-picker-item-active'
                    )}
                    onClick={() => handleSelect(model)}
                  >
                    <Text className="model-picker-item-text">{model}</Text>
                    {model === current && (
                      <Text className="model-picker-item-check">✓</Text>
                    )}
                  </View>
                ))
              ) : (
                <View className="model-picker-empty">
                  <Text>
                    {config.channelMode === 'remote'
                      ? '暂无可用模型'
                      : '请先拉取模型列表'}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  )
}
