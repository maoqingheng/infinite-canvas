import { useEffect, useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { fetchPrompts, type Prompt } from '../../services/api/prompts'
import './index.scss'

const navigationTools = [
  { slug: 'canvas', label: 'My Canvas' },
  { slug: 'image', label: '生图工作台' },
  { slug: 'prompts', label: '提示词库' },
  { slug: 'assets', label: '我的素材' },
  { slug: 'asset-library', label: '素材库' },
]

function navigateTo(slug: string) {
  if (slug === 'canvas') {
    Taro.showToast({ title: '画布功能暂未迁移', icon: 'none' })
    return
  }
  Taro.navigateTo({ url: `/pages/${slug}/index` }).catch(() => {
    Taro.switchTab({ url: `/pages/index/index` }).catch(() => {})
  })
}

export default function IndexPage() {
  const [promptShowcase, setPromptShowcase] = useState<Prompt[]>([])
  const [previewIndex, setPreviewIndex] = useState(0)
  const [previewOpen, setPreviewOpen] = useState(false)

  useEffect(() => {
    void fetchPrompts({ pageSize: 12 })
      .then((data) => setPromptShowcase(data.items))
      .catch(() => {})
  }, [])

  return (
    <View className="index-page">
      {/* Hero Section */}
      <View className="hero">
        <Text className="hero-title">无限画布</Text>
        <Text className="hero-desc">
          AI 驱动的创作工具，轻松生成图片、管理素材。
        </Text>
        <View className="hero-actions">
          <View
            className="hero-btn hero-btn-primary"
            onClick={() => navigateTo('image')}
          >
            <Text>开始使用</Text>
          </View>
        </View>
      </View>

      {/* Tool Cards */}
      <View className="tools-section">
        <View className="tools-grid">
          {navigationTools.map((tool) => (
            <View
              key={tool.slug}
              className="tool-card"
              onClick={() => navigateTo(tool.slug)}
            >
              <View className="tool-icon">
                <Text className="tool-icon-text">{toolIcon(tool.slug)}</Text>
              </View>
              <Text className="tool-label">{tool.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Prompt Showcase Section */}
      {promptShowcase.length > 0 && (
        <View className="showcase-section">
          <View className="showcase-header">
            <View>
              <Text className="showcase-title">沉淀每一次好结果</Text>
              <Text className="showcase-desc">
                收藏稳定出图的提示词、参考风格和结果图片，让下一次创作从已有经验开始。
              </Text>
            </View>
            <View
              className="showcase-link"
              onClick={() => navigateTo('prompts')}
            >
              <Text>查看提示词库 →</Text>
            </View>
          </View>

          <View className="showcase-grid">
            {promptShowcase.map((item, index) => (
              <View
                key={item.id}
                className={`showcase-card ${index === 0 ? 'showcase-card-large' : ''} ${index === 3 ? 'showcase-card-wide' : ''}`}
                onClick={() => {
                  setPreviewIndex(index)
                  setPreviewOpen(true)
                }}
              >
                {item.coverUrl ? (
                  <Image
                    className="showcase-card-img"
                    src={item.coverUrl}
                    mode="aspectFill"
                  />
                ) : (
                  <View className="showcase-card-placeholder">
                    <Text className="showcase-card-text-preview">
                      {item.prompt.slice(0, 60)}
                    </Text>
                  </View>
                )}
                <View className="showcase-card-overlay">
                  <View className="showcase-card-tags">
                    {item.tags.slice(0, 2).map((tag) => (
                      <View key={tag} className="showcase-tag">
                        <Text>{tag}</Text>
                      </View>
                    ))}
                  </View>
                  <Text className="showcase-card-title">{item.title}</Text>
                  <Text className="showcase-card-prompt">{item.prompt}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Image Preview Popup */}
      {previewOpen && promptShowcase[previewIndex] && (
        <View
          className="preview-mask"
          onClick={() => setPreviewOpen(false)}
        >
          <Image
            className="preview-image"
            src={promptShowcase[previewIndex].coverUrl}
            mode="widthFix"
          />
        </View>
      )}
    </View>
  )
}

function toolIcon(slug: string): string {
  switch (slug) {
    case 'canvas':
      return '🎨'
    case 'image':
      return '🖼️'
    case 'prompts':
      return '📝'
    case 'assets':
      return '📁'
    case 'asset-library':
      return '📚'
    default:
      return '🔧'
  }
}
