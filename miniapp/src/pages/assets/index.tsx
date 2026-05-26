import { useMemo, useState, useEffect } from 'react'
import { View, Text, Input, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCopyText } from '../../hooks/use-copy-text'
import { formatBytes } from '../../utils/format'
import { cn } from '../../utils/cn'
import {
  useAssetStore,
  type Asset,
  type AssetKind,
} from '../../stores/use-asset-store'
import './index.scss'

const kindOptions: Array<{ label: string; value: AssetKind | 'all' }> = [
  { label: '全部', value: 'all' },
  { label: '文本', value: 'text' },
  { label: '图片', value: 'image' },
]

const PAGE_SIZE = 10

export default function AssetsPage() {
  const copyText = useCopyText()
  const assets = useAssetStore((state) => state.assets)
  const addAsset = useAssetStore((state) => state.addAsset)
  const updateAsset = useAssetStore((state) => state.updateAsset)
  const removeAsset = useAssetStore((state) => state.removeAsset)

  const [keyword, setKeyword] = useState('')
  const [kindFilter, setKindFilter] = useState<AssetKind | 'all'>('all')
  const [page, setPage] = useState(1)
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formKind, setFormKind] = useState<AssetKind>('text')
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formTags, setFormTags] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null)

  const validAssets = useMemo(
    () =>
      assets.filter(
        (asset) =>
          asset.kind === 'text' ||
          asset.kind === 'image' ||
          asset.kind === 'video'
      ),
    [assets]
  )

  const filteredAssets = useMemo(() => {
    const query = keyword.trim().toLowerCase()
    return validAssets.filter((asset) => {
      if (kindFilter !== 'all' && asset.kind !== kindFilter) return false
      if (!query) return true
      return assetSearchText(asset).includes(query)
    })
  }, [validAssets, keyword, kindFilter])

  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / PAGE_SIZE))
  const visibleAssets = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredAssets.slice(start, start + PAGE_SIZE)
  }, [filteredAssets, page])

  useEffect(() => {
    setPage((v) => Math.min(v, totalPages))
  }, [totalPages])

  const openCreate = () => {
    setEditingAsset(null)
    setFormKind('text')
    setFormTitle('')
    setFormContent('')
    setFormTags('')
    setShowForm(true)
  }

  const openEdit = (asset: Asset) => {
    setEditingAsset(asset)
    setFormKind(asset.kind as AssetKind)
    setFormTitle(asset.title)
    setFormContent(asset.kind === 'text' ? asset.data.content : '')
    setFormTags((asset.tags || []).join(', '))
    setShowForm(true)
  }

  const saveAsset = () => {
    if (!formTitle.trim()) {
      Taro.showToast({ title: '请输入标题', icon: 'none' })
      return
    }
    const base = {
      title: formTitle.trim(),
      coverUrl: '',
      tags: formTags
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean),
    }
    if (formKind === 'text') {
      const data = { kind: 'text' as const, data: { content: formContent.trim() }, ...base }
      if (editingAsset) updateAsset(editingAsset.id, data)
      else addAsset(data)
    }
    Taro.showToast({ title: editingAsset ? '素材已更新' : '素材已保存', icon: 'success' })
    setShowForm(false)
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    removeAsset(deleteTarget.id)
    Taro.showToast({ title: '素材已删除', icon: 'success' })
    setDeleteTarget(null)
  }

  const downloadImage = (asset: Asset) => {
    if (asset.kind !== 'image') return
    Taro.downloadFile({
      url: asset.data.dataUrl,
      success: (res) => {
        Taro.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () =>
            Taro.showToast({ title: '已保存到相册', icon: 'success' }),
          fail: () =>
            Taro.showToast({ title: '保存失败', icon: 'none' }),
        })
      },
      fail: () => Taro.showToast({ title: '下载失败', icon: 'none' }),
    })
  }

  return (
    <View className="assets-page">
      <View className="assets-hero">
        <Text className="assets-title">我的素材</Text>
        <Text className="assets-subtitle">
          收藏常用文本和图片，按类型、标题和标签快速查找。
        </Text>
      </View>

      <View className="assets-search">
        <Input
          className="search-input"
          value={keyword}
          placeholder="搜索标题、内容、标签或来源"
          onInput={(e) => {
            setPage(1)
            setKeyword(e.detail.value)
          }}
        />
      </View>

      <View className="assets-filter">
        <View className="filter-row">
          <Text className="filter-label">类型</Text>
          <View className="filter-tags">
            {kindOptions.map((opt) => (
              <View
                key={opt.value}
                className={cn(
                  'filter-tag',
                  kindFilter === opt.value && 'filter-tag-active'
                )}
                onClick={() => {
                  setPage(1)
                  setKindFilter(opt.value)
                }}
              >
                <Text>{opt.label}</Text>
              </View>
            ))}
          </View>
        </View>
        <View className="add-asset-btn" onClick={openCreate}>
          <Text>+ 新增素材</Text>
        </View>
      </View>

      <ScrollView scrollY className="assets-scroll">
        <View className="assets-grid">
          {visibleAssets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onOpen={() => setPreviewAsset(asset)}
              onEdit={() => openEdit(asset)}
              onCopy={() => {
                if (asset.kind === 'text')
                  copyText(asset.data.content, '已复制')
              }}
              onDownload={() => downloadImage(asset)}
              onDelete={() => setDeleteTarget(asset)}
            />
          ))}
        </View>

        {visibleAssets.length === 0 && (
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
            {page} / {totalPages}（共 {filteredAssets.length} 项）
          </Text>
          <View
            className={cn('page-btn', page >= totalPages && 'page-btn-disabled')}
            onClick={() => setPage((v) => Math.min(totalPages, v + 1))}
          >
            <Text>下一页</Text>
          </View>
        </View>
      </ScrollView>

      {/* Form Popup */}
      {showForm && (
        <View className="popup-mask" onClick={() => setShowForm(false)}>
          <View className="popup-content" onClick={(e) => e.stopPropagation()}>
            <View className="popup-header">
              <Text className="popup-title">
                {editingAsset ? '编辑素材' : '新增素材'}
              </Text>
              <View
                className="popup-close"
                onClick={() => setShowForm(false)}
              >
                <Text>✕</Text>
              </View>
            </View>

            <View className="form-section">
              <View className="kind-switch">
                <View
                  className={cn('kind-item', formKind === 'text' && 'active')}
                  onClick={() => setFormKind('text')}
                >
                  <Text>文本</Text>
                </View>
                <View
                  className={cn('kind-item', formKind === 'image' && 'active')}
                  onClick={() => setFormKind('image')}
                >
                  <Text>图片</Text>
                </View>
              </View>

              <View className="form-item">
                <Text className="form-label">标题 *</Text>
                <Input
                  className="form-input"
                  value={formTitle}
                  placeholder="给素材起一个容易检索的名字"
                  onInput={(e) => setFormTitle(e.detail.value)}
                />
              </View>

              <View className="form-item">
                <Text className="form-label">标签</Text>
                <Input
                  className="form-input"
                  value={formTags}
                  placeholder="输入标签，逗号分隔"
                  onInput={(e) => setFormTags(e.detail.value)}
                />
              </View>

              {formKind === 'text' && (
                <View className="form-item">
                  <Text className="form-label">文本内容</Text>
                  <Input
                    className="form-textarea"
                    value={formContent}
                    placeholder="保存提示词、说明文案等文本素材"
                    onInput={(e) => setFormContent(e.detail.value)}
                  />
                </View>
              )}

              {formKind === 'image' && (
                <View className="form-item">
                  <Text className="form-label">图片</Text>
                  <View className="image-upload-placeholder">
                    <Text className="image-upload-hint">图片类型请通过生图工作台添加入库</Text>
                  </View>
                </View>
              )}
            </View>

            <View className="popup-actions">
              <View className="popup-btn primary" onClick={saveAsset}>
                <Text>保存</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Detail Popup */}
      {previewAsset && (
        <View className="popup-mask" onClick={() => setPreviewAsset(null)}>
          <View className="popup-content" onClick={(e) => e.stopPropagation()}>
            <View className="popup-header">
              <Text className="popup-title">{previewAsset.title}</Text>
              <View
                className="popup-close"
                onClick={() => setPreviewAsset(null)}
              >
                <Text>✕</Text>
              </View>
            </View>

            {previewAsset.kind === 'image' && previewAsset.coverUrl && (
              <Image
                className="popup-preview-img"
                src={previewAsset.coverUrl}
                mode="widthFix"
              />
            )}

            <View className="popup-meta">
              <View className="kind-badge">
                <Text>
                  {previewAsset.kind === 'text' ? '文本' : '图片'}
                </Text>
              </View>
              {previewAsset.tags.map((tag) => (
                <View key={tag} className="meta-tag">
                  <Text>{tag}</Text>
                </View>
              ))}
            </View>

            {previewAsset.kind === 'text' && (
              <View className="popup-content-box">
                <Text className="popup-content-text">
                  {previewAsset.data.content}
                </Text>
              </View>
            )}

            {previewAsset.kind === 'image' && (
              <View className="popup-content-box">
                <Text className="popup-content-text">
                  {previewAsset.data.width}x{previewAsset.data.height} ·{' '}
                  {formatBytes(previewAsset.data.bytes)}
                </Text>
              </View>
            )}

            <View className="popup-actions">
              {previewAsset.kind === 'text' && (
                <View
                  className="popup-btn primary"
                  onClick={() =>
                    copyText(previewAsset.data.content, '已复制')
                  }
                >
                  <Text>复制</Text>
                </View>
              )}
              {previewAsset.kind === 'image' && (
                <View
                  className="popup-btn primary"
                  onClick={() => downloadImage(previewAsset)}
                >
                  <Text>下载</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <View className="popup-mask" onClick={() => setDeleteTarget(null)}>
          <View className="popup-content confirm-popup" onClick={(e) => e.stopPropagation()}>
            <Text className="confirm-text">
              确定删除「{deleteTarget.title}」吗？
            </Text>
            <View className="popup-actions confirm-actions">
              <View
                className="popup-btn"
                onClick={() => setDeleteTarget(null)}
              >
                <Text>取消</Text>
              </View>
              <View
                className="popup-btn danger"
                onClick={confirmDelete}
              >
                <Text>删除</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

function AssetCard({
  asset,
  onOpen,
  onEdit,
  onCopy,
  onDownload,
  onDelete,
}: {
  asset: Asset
  onOpen: () => void
  onEdit: () => void
  onCopy: () => void
  onDownload: () => void
  onDelete: () => void
}) {
  const cover = asset.coverUrl || (asset.kind === 'image' ? (asset as { data: { dataUrl: string } }).data.dataUrl : '')
  return (
    <View className="asset-card">
      <View className="asset-card-top" onClick={onOpen}>
        {cover ? (
          <Image className="asset-card-img" src={cover} mode="aspectFill" />
        ) : (
          <View className="asset-card-img-empty">
            <Text className="asset-card-text-preview">
              {asset.kind === 'text'
                ? (asset as { data: { content: string } }).data.content.slice(0, 60)
                : '暂无封面'}
            </Text>
          </View>
        )}
      </View>
      <View className="asset-card-body">
        <View className="asset-card-header" onClick={onOpen}>
          <Text className="asset-card-title">{asset.title}</Text>
          <View className="asset-kind-badge">
            <Text>{asset.kind === 'text' ? '文本' : '图片'}</Text>
          </View>
        </View>
        <View className="asset-card-tags">
          {(asset.tags || []).slice(0, 3).map((tag) => (
            <View key={tag} className="card-tag">
              <Text>{tag}</Text>
            </View>
          ))}
        </View>
        <View className="asset-card-actions">
          <View className="card-action" onClick={onOpen}>
            <Text>查看</Text>
          </View>
          {asset.kind !== 'video' && (
            <View className="card-action" onClick={onEdit}>
              <Text>编辑</Text>
            </View>
          )}
          {asset.kind === 'text' && (
            <View className="card-action" onClick={onCopy}>
              <Text>复制</Text>
            </View>
          )}
          {asset.kind === 'image' && (
            <View className="card-action" onClick={onDownload}>
              <Text>下载</Text>
            </View>
          )}
          <View className="card-action danger" onClick={onDelete}>
            <Text>删除</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

function assetSearchText(asset: Asset) {
  return [
    asset.title,
    asset.note || '',
    (asset.tags || []).join(' '),
    asset.kind === 'text' ? (asset as { data: { content: string } }).data.content : '',
  ]
    .join(' ')
    .toLowerCase()
}
