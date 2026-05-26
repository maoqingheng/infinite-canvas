import { useState, useEffect } from 'react'
import { View, Text, Input, Image, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { usePromptList } from '../../hooks/use-prompt-list'
import { useCopyText } from '../../hooks/use-copy-text'
import { useAssetStore } from '../../stores/use-asset-store'
import {
  ALL_PROMPTS_OPTION,
  type Prompt,
} from '../../services/api/prompts'
import { cn } from '../../utils/cn'
import './index.scss'

export default function PromptsPage() {
  const [keyword, setKeyword] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] =
    useState(ALL_PROMPTS_OPTION)
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null)
  const addAsset = useAssetStore((state) => state.addAsset)
  const copyText = useCopyText()

  const {
    query,
    items: promptItems,
    tags: promptTags,
    categories: promptCategoryOptions,
    total: totalPrompts,
  } = usePromptList({
    keyword,
    tags: selectedTags,
    category: selectedCategory,
  })

  useEffect(() => {
    if (query.isError) {
      Taro.showToast({
        title:
          query.error instanceof Error ? query.error.message : '获取提示词失败',
        icon: 'none',
      })
    }
  }, [query.error, query.isError])

  const toggleTag = (tag: string) => {
    if (tag === ALL_PROMPTS_OPTION) return setSelectedTags([])
    setSelectedTags((items) =>
      items.includes(tag)
        ? items.filter((item) => item !== tag)
        : [...items, tag]
    )
  }

  const savePromptAsset = (item: Prompt) => {
    addAsset({
      kind: 'text',
      title: item.title,
      coverUrl: item.coverUrl,
      tags: item.tags,
      source: item.category,
      data: { content: item.prompt },
      metadata: {
        source: 'prompt-library',
        promptId: item.id,
        githubUrl: item.githubUrl,
      },
    })
    Taro.showToast({ title: '已加入我的素材', icon: 'success' })
  }

  const handleScrollToLower = () => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage()
    }
  }

  const renderFilterTags = (
    items: string[],
    selected: string | string[],
    onChange: (item: string) => void
  ) => (
    <View className="filter-tags">
      {items.map((item) => {
        const isSelected = Array.isArray(selected)
          ? selected.length === 0
            ? item === ALL_PROMPTS_OPTION
            : selected.includes(item)
          : selected === item
        return (
          <View
            key={item}
            className={cn('filter-tag', isSelected && 'filter-tag-active')}
            onClick={() => onChange(item)}
          >
            <Text>{item}</Text>
          </View>
        )
      })}
    </View>
  )

  return (
    <View className="prompts-page">
      <View className="prompts-hero">
        <Text className="prompts-title">提示词中心</Text>
        <Text className="prompts-subtitle">
          共 {totalPrompts} 条提示词，按标题、标签与分类快速查找灵感。
        </Text>
      </View>

      <View className="search-bar">
        <Input
          className="search-input"
          value={keyword}
          placeholder="按标题查询"
          onInput={(e) => setKeyword(e.detail.value)}
        />
      </View>

      {!query.isLoading && (
        <View className="filter-section">
          <View className="filter-row">
            <Text className="filter-label">分类</Text>
            {renderFilterTags(promptCategoryOptions, selectedCategory, (cat) =>
              setSelectedCategory(cat)
            )}
          </View>
          <View className="filter-row">
            <Text className="filter-label">标签</Text>
            {renderFilterTags(promptTags, selectedTags, toggleTag)}
          </View>
        </View>
      )}

      {query.isLoading ? (
        <View className="loading-wrap">
          <Text className="loading-text">加载中...</Text>
        </View>
      ) : (
        <ScrollView
          className="prompt-list-scroll"
          scrollY
          onScrollToLower={handleScrollToLower}
        >
          <View className="prompt-grid">
            {promptItems.map((item) => (
              <PromptCardView
                key={item.id}
                item={item}
                onOpen={() => setSelectedPrompt(item)}
                onCopy={() => copyText(item.prompt, '提示词已复制')}
                onSaveAsset={() => savePromptAsset(item)}
              />
            ))}
          </View>

          {promptItems.length === 0 && (
            <View className="empty-wrap">
              <Text className="empty-text">没有找到匹配的提示词</Text>
            </View>
          )}

          <View className="load-more-hint">
            <Text className="hint-text">
              {query.isFetchingNextPage
                ? '加载中...'
                : query.hasNextPage
                  ? '继续向下滚动加载更多'
                  : promptItems.length > 0
                    ? '已经到底了'
                    : ''}
            </Text>
          </View>
        </ScrollView>
      )}

      {selectedPrompt && (
        <PromptDetailPopup
          prompt={selectedPrompt}
          onClose={() => setSelectedPrompt(null)}
          onCopy={(p) => copyText(p, '提示词已复制')}
          onSaveAsset={savePromptAsset}
        />
      )}
      <View className="back-home" onClick={() => Taro.navigateTo({ url: '/pages/index/index' })}>
        <Text>←</Text>
      </View>
    </View>
  )
}

function PromptCardView({
  item,
  onOpen,
  onCopy,
  onSaveAsset,
}: {
  item: Prompt
  onOpen: () => void
  onCopy: () => void
  onSaveAsset: () => void
}) {
  return (
    <View className="prompt-card" onClick={onOpen}>
      {item.coverUrl ? (
        <View className="prompt-card-cover">
          <Image
            className="prompt-card-img"
            src={item.coverUrl}
            mode="aspectFill"
          />
        </View>
      ) : (
        <View className="prompt-card-cover-empty">
          <Text className="prompt-card-text-preview">{item.prompt.slice(0, 80)}</Text>
        </View>
      )}
      <View className="prompt-card-body">
        <View className="prompt-card-header">
          <Text className="prompt-card-title">{item.title}</Text>
          <View className="prompt-card-tags">
            {item.tags.slice(0, 3).map((tag) => (
              <View key={tag} className="card-tag">
                <Text>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
        <View className="prompt-card-actions">
          <View className="card-action" onClick={(e) => { e.stopPropagation(); onCopy() }}>
            <Text>复制</Text>
          </View>
          <View className="card-action" onClick={(e) => { e.stopPropagation(); onSaveAsset() }}>
            <Text>加入素材</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

function PromptDetailPopup({
  prompt,
  onClose,
  onCopy,
  onSaveAsset,
}: {
  prompt: Prompt
  onClose: () => void
  onCopy: (p: string) => void
  onSaveAsset: (item: Prompt) => void
}) {
  return (
    <View className="popup-mask" onClick={onClose}>
      <View className="popup-content" onClick={(e) => e.stopPropagation()}>
        <View className="popup-header">
          <Text className="popup-title">{prompt.title}</Text>
          <View className="popup-close" onClick={onClose}>
            <Text>✕</Text>
          </View>
        </View>

        {prompt.coverUrl && (
          <Image
            className="popup-cover"
            src={prompt.coverUrl}
            mode="widthFix"
          />
        )}

        <View className="popup-section">
          <Text className="popup-label">提示词内容</Text>
          <View className="popup-content-box">
            <Text className="popup-content-text">{prompt.prompt}</Text>
          </View>
        </View>

        <View className="popup-tags">
          {prompt.tags.map((tag) => (
            <View key={tag} className="popup-tag">
              <Text>{tag}</Text>
            </View>
          ))}
          <View className="popup-tag popup-tag-category">
            <Text>{prompt.category}</Text>
          </View>
        </View>

        <View className="popup-actions">
          <View className="popup-btn" onClick={() => onCopy(prompt.prompt)}>
            <Text>复制提示词</Text>
          </View>
          <View className="popup-btn primary" onClick={() => onSaveAsset(prompt)}>
            <Text>加入我的素材</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
