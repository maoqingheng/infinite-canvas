import { useState, useEffect } from 'react'
import { View, Text, Input, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useQuery } from '@tanstack/react-query'
import { useCopyText } from '../../hooks/use-copy-text'
import { useAssetStore } from '../../stores/use-asset-store'
import { cn } from '../../utils/cn'
import {
  fetchAssetLibrary,
  type AssetLibraryItem,
} from '../../services/api/assets'
import './index.scss'

const PAGE_SIZE = 12

export default function AssetLibraryPage() {
  const copyText = useCopyText()
  const addAsset = useAssetStore((state) => state.addAsset)
  const [keyword, setKeyword] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [selectedAsset, setSelectedAsset] =
    useState<AssetLibraryItem | null>(null)

  const query = useQuery({
    queryKey: ['asset-library', keyword, selectedType, selectedTags, page],
    queryFn: () =>
      fetchAssetLibrary({
        keyword,
        type: selectedType,
        tag: selectedTags,
        page,
        pageSize: PAGE_SIZE,
      }),
    retry: false,
  })

  useEffect(() => {
    if (query.isError) {
      Taro.showToast({
        title:
          query.error instanceof Error ? query.error.message : '获取素材库失败',
        icon: 'none',
      })
    }
  }, [query.error, query.isError])

  const isReady = query.isFetched || query.isError
  const items = query.data?.items || []
  const availableTags = query.data?.tags || []
  const total = query.data?.total || 0

  const toggleTag = (tag: string) => {
    setSelectedTags((items) =>
      items.includes(tag)
        ? items.filter((item) => item !== tag)
        : [...items, tag]
    )
  }

  const saveToMyAssets = (asset: AssetLibraryItem) => {
    if (asset.type === 'image') {
      addAsset({
        kind: 'image',
        title: asset.title,
        coverUrl: asset.coverUrl,
        tags: asset.tags,
        source: asset.category,
        note: asset.description,
        data: {
          dataUrl: asset.url,
          width: 0,
          height: 0,
          bytes: 0,
          mimeType: 'image/png',
        },
        metadata: { source: 'asset-library', assetId: asset.id },
      })
    } else {
      addAsset({
        kind: 'text',
        title: asset.title,
        coverUrl: asset.coverUrl,
        tags: asset.tags,
        source: asset.category,
        note: asset.description,
        data: { content: asset.content },
        metadata: { source: 'asset-library', assetId: asset.id },
      })
    }
    Taro.showToast({ title: '已加入我的素材', icon: 'success' })
  }

  if (!isReady) {
    return (
      <View className="lib-page">
        <View className="loading-wrap">
          <Text className="loading-text">加载中...</Text>
        </View>
      </View>
    )
  }

  return (
    <View className="lib-page">
      <View className="lib-hero">
        <Text className="lib-title">素材库</Text>
        <Text className="lib-subtitle">
          挑选团队素材，加入我的素材后继续编辑和使用。
        </Text>
      </View>

      <View className="lib-search">
        <Input
          className="search-input"
          value={keyword}
          placeholder="按标题查询"
          onInput={(e) => {
            setPage(1)
            setKeyword(e.detail.value)
          }}
        />
      </View>

      <View className="lib-filter">
        <View className="filter-row">
          <Text className="filter-label">类型</Text>
          <View className="filter-tags">
            {[
              { label: '全部', value: '' },
              { label: '文本', value: 'text' },
              { label: '图片', value: 'image' },
            ].map((item) => (
              <View
                key={item.value || 'all'}
                className={cn(
                  'filter-tag',
                  selectedType === item.value && 'filter-tag-active'
                )}
                onClick={() => {
                  setPage(1)
                  setSelectedType(item.value)
                }}
              >
                <Text>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
        <View className="filter-row">
          <Text className="filter-label">标签</Text>
          <View className="filter-tags">
            <View
              className={cn(
                'filter-tag',
                selectedTags.length === 0 && 'filter-tag-active'
              )}
              onClick={() => {
                setPage(1)
                setSelectedTags([])
              }}
            >
              <Text>全部</Text>
            </View>
            {availableTags.map((tag) => (
              <View
                key={tag}
                className={cn(
                  'filter-tag',
                  selectedTags.includes(tag) && 'filter-tag-active'
                )}
                onClick={() => {
                  setPage(1)
                  toggleTag(tag)
                }}
              >
                <Text>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <ScrollView scrollY className="lib-scroll">
        <View className="lib-grid">
          {items.map((asset) => (
            <LibraryCard
              key={asset.id}
              asset={asset}
              onOpen={() => setSelectedAsset(asset)}
              onAdd={() => saveToMyAssets(asset)}
            />
          ))}
        </View>

        {items.length === 0 && (
          <View className="empty-wrap">
            <Text className="empty-text">没有找到素材</Text>
          </View>
        )}

        <View className="pagination">
          <View
            className={cn('page-btn', page <= 1 && 'page-btn-disabled')}
            onClick={() => setPage((v) => Math.max(1, v - 1))}
          >
            <Text>上一页</Text>
          </View>
          <Text className="page-info">
            {page} / {Math.ceil(total / PAGE_SIZE)}（共 {total} 项）
          </Text>
          <View
            className={cn(
              'page-btn',
              page * PAGE_SIZE >= total && 'page-btn-disabled'
            )}
            onClick={() => setPage((v) => v + 1)}
          >
            <Text>下一页</Text>
          </View>
        </View>
      </ScrollView>

      {/* Detail Popup */}
      {selectedAsset && (
        <View
          className="popup-mask"
          onClick={() => setSelectedAsset(null)}
        >
          <View className="popup-content" onClick={(e) => e.stopPropagation()}>
            <View className="popup-header">
              <Text className="popup-title">{selectedAsset.title}</Text>
              <View
                className="popup-close"
                onClick={() => setSelectedAsset(null)}
              >
                <Text>✕</Text>
              </View>
            </View>

            {selectedAsset.coverUrl && (
              <Image
                className="popup-cover"
                src={selectedAsset.coverUrl}
                mode="widthFix"
              />
            )}

            <View className="popup-meta">
              <View className="kind-badge">
                <Text>
                  {selectedAsset.type === 'image' ? '图片' : '文本'}
                </Text>
              </View>
              {selectedAsset.tags.map((tag) => (
                <View key={tag} className="meta-tag">
                  <Text>{tag}</Text>
                </View>
              ))}
            </View>

            <View className="popup-content-box">
              <Text className="popup-label-text">内容</Text>
              <Text className="popup-body-text">
                {selectedAsset.type === 'text'
                  ? selectedAsset.content
                  : selectedAsset.url}
              </Text>
            </View>

            {selectedAsset.description && (
              <View className="popup-desc">
                <Text>{selectedAsset.description}</Text>
              </View>
            )}

            <View className="popup-actions">
              {selectedAsset.type === 'text' && (
                <View
                  className="popup-btn"
                  onClick={() =>
                    copyText(selectedAsset.content, '已复制')
                  }
                >
                  <Text>复制文本</Text>
                </View>
              )}
              <View
                className="popup-btn primary"
                onClick={() => saveToMyAssets(selectedAsset)}
              >
                <Text>加入我的素材</Text>
              </View>
            </View>
          </View>
        </View>
      )}
      <View className="back-home" onClick={() => Taro.navigateTo({ url: '/pages/index/index' })}>
        <Text>←</Text>
      </View>
    </View>
  )
}

function LibraryCard({
  asset,
  onOpen,
  onAdd,
}: {
  asset: AssetLibraryItem
  onOpen: () => void
  onAdd: () => void
}) {
  return (
    <View className="lib-card">
      <View className="lib-card-top" onClick={onOpen}>
        {asset.coverUrl ? (
          <Image
            className="lib-card-img"
            src={asset.coverUrl}
            mode="aspectFill"
          />
        ) : (
          <View className="lib-card-img-empty">
            <Text className="lib-card-text-preview">
              {asset.content || '暂无封面'}
            </Text>
          </View>
        )}
      </View>
      <View className="lib-card-body">
        <View className="lib-card-header" onClick={onOpen}>
          <Text className="lib-card-title">{asset.title}</Text>
          <View className="lib-kind-badge">
            <Text>{asset.type === 'image' ? '图片' : '文本'}</Text>
          </View>
        </View>
        <View className="lib-card-tags">
          {asset.tags.slice(0, 3).map((tag) => (
            <View key={tag} className="card-tag">
              <Text>{tag}</Text>
            </View>
          ))}
        </View>
        <View className="lib-card-actions">
          <View className="card-action" onClick={onOpen}>
            <Text>查看</Text>
          </View>
          <View className="card-action" onClick={onAdd}>
            <Text>加入素材</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
