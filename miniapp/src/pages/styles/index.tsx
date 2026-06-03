import { useEffect, useState } from 'react'
import { View, Text, Input, Image, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'

import {
  fetchStyleDetails,
  fetchStyles,
  type Style,
  type StyleDetail,
} from '../../services/api/styles'
import { setImageWorkbenchPayload } from '../../lib/image-workbench-payload'
import { cn } from '../../utils/cn'
import './index.scss'

export default function StylesPage() {
  const [keyword, setKeyword] = useState('')
  const [hotOnly, setHotOnly] = useState(false)
  const [styles, setStyles] = useState<Style[]>([])
  const [hotStyleDetails, setHotStyleDetails] = useState<StyleDetail[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedStyle, setSelectedStyle] = useState<Style | null>(null)
  const [styleDetails, setStyleDetails] = useState<StyleDetail[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)

  useEffect(() => {
    let canceled = false
    setLoading(true)
    const request = hotOnly
      ? fetchStyleDetails(0, { keyword, isHot: 1, pageSize: 200 })
      : fetchStyles({ keyword, pageSize: 200 })
    void request
      .then((data) => {
        if (canceled) return
        if (hotOnly) {
          setHotStyleDetails(data.items as StyleDetail[])
        } else {
          setStyles(data.items as Style[])
        }
        setTotal(data.total)
      })
      .catch((error) =>
        Taro.showToast({
          title: error instanceof Error ? error.message : '获取风格失败',
          icon: 'none',
        })
      )
      .finally(() => {
        if (!canceled) setLoading(false)
      })
    return () => {
      canceled = true
    }
  }, [hotOnly, keyword])

  const openStyle = async (style: Style) => {
    setSelectedStyle(style)
    setLoadingDetails(true)
    try {
      const data = await fetchStyleDetails(style.id, {
        pageSize: 200,
        isHot: hotOnly ? 1 : undefined,
      })
      setStyleDetails(data.items)
    } catch (error) {
      Taro.showToast({
        title: error instanceof Error ? error.message : '获取风格子项失败',
        icon: 'none',
      })
    } finally {
      setLoadingDetails(false)
    }
  }

  const generateLikeStyle = (detail: StyleDetail) => {
    setImageWorkbenchPayload({
      styleRef: detail.logo,
      styleName: detail.name,
      prompt: detail.fePrompt,
    })
    Taro.switchTab({ url: '/pages/image/index' })
  }

  return (
    <View className="styles-page">
      <View className="styles-hero">
        <Text className="styles-title">风格库</Text>
        <Text className="styles-subtitle">
          {hotOnly
            ? `共 ${total} 个热门子风格，直接带参考图进入生图工作台。`
            : `共 ${total} 个风格分类，挑选稳定风格模板快速生成同款图片。`}
        </Text>
      </View>

      <View className="styles-search">
        <Input
          className="styles-search-input"
          value={keyword}
          placeholder="按风格名称查询"
          onInput={(event) => setKeyword(event.detail.value)}
        />
      </View>

      <View className="styles-filter">
        <Text className="style-filter-label">筛选</Text>
        <View
          className={cn('style-filter-chip', hotOnly && 'style-filter-chip-active')}
          onClick={() => {
            setSelectedStyle(null)
            setHotOnly((value) => !value)
          }}
        >
          <Text>只看热门</Text>
        </View>
      </View>

      {loading ? (
        <View className="loading-wrap">
          <Text className="loading-text">加载中...</Text>
        </View>
      ) : (
        <ScrollView scrollY className="styles-scroll">
          {hotOnly ? (
            <View className="styles-grid">
              {hotStyleDetails.map((detail) => (
                <View key={detail.id} className="style-detail-card">
                  {detail.logo ? (
                    <Image
                      className="style-detail-cover"
                      src={detail.logo}
                      mode="aspectFill"
                    />
                  ) : (
                    <View className="style-detail-cover-empty">
                      <Text>{detail.name.slice(0, 1)}</Text>
                    </View>
                  )}
                  <View className="style-detail-body">
                    <Text className="style-detail-name">{detail.name}</Text>
                    {detail.fePrompt ? (
                      <Text className="style-detail-prompt">
                        {detail.fePrompt}
                      </Text>
                    ) : null}
                    <View
                      className="generate-like-btn"
                      onClick={() => generateLikeStyle(detail)}
                    >
                      <Text>生成同款</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className="styles-grid">
              {styles.map((style) => (
                <View
                  key={style.id}
                  className="style-card"
                  onClick={() => void openStyle(style)}
                >
                  {style.coverUrl ? (
                    <Image
                      className="style-cover"
                      src={style.coverUrl}
                      mode="aspectFill"
                    />
                  ) : (
                    <View className="style-cover-empty">
                      <Text>{style.name.slice(0, 1)}</Text>
                    </View>
                  )}
                  <View className="style-card-body">
                    <Text className="style-name">{style.name}</Text>
                    <Text className="style-count">
                      {style.activeStylesCount} 个子模板
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
          {(hotOnly ? hotStyleDetails.length === 0 : styles.length === 0) ? (
            <View className="empty-wrap">
              <Text className="empty-text">
                {hotOnly ? '暂无热门风格' : '暂无风格分类'}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      )}

      {selectedStyle ? (
        <View className="style-detail-mask" onClick={() => setSelectedStyle(null)}>
          <View
            className="style-detail-sheet"
            onClick={(event) => event.stopPropagation()}
          >
            <View className="style-detail-header">
              <View>
                <Text className="style-detail-title">{selectedStyle.name}</Text>
                <Text className="style-detail-desc">
                  {hotOnly ? '选择一个热门子风格生成同款' : '选择一个子风格生成同款'}
                </Text>
              </View>
              <View
                className="style-detail-close"
                onClick={() => setSelectedStyle(null)}
              >
                <Text>×</Text>
              </View>
            </View>
            {loadingDetails ? (
              <View className="loading-wrap">
                <Text className="loading-text">加载中...</Text>
              </View>
            ) : (
              <ScrollView scrollY className="style-detail-scroll">
                <View className="style-detail-grid">
                  {styleDetails.map((detail) => (
                    <View key={detail.id} className="style-detail-card">
                      {detail.logo ? (
                        <Image
                          className="style-detail-cover"
                          src={detail.logo}
                          mode="aspectFill"
                        />
                      ) : (
                        <View className="style-detail-cover-empty">
                          <Text>{detail.name.slice(0, 1)}</Text>
                        </View>
                      )}
                      <View className="style-detail-body">
                        <Text className="style-detail-name">{detail.name}</Text>
                        {detail.fePrompt ? (
                          <Text className="style-detail-prompt">
                            {detail.fePrompt}
                          </Text>
                        ) : null}
                        <View
                          className="generate-like-btn"
                          onClick={() => generateLikeStyle(detail)}
                        >
                          <Text>生成同款</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
                {!styleDetails.length ? (
                  <View className="empty-wrap">
                    <Text className="empty-text">暂无子风格</Text>
                  </View>
                ) : null}
              </ScrollView>
            )}
          </View>
        </View>
      ) : null}
    </View>
  )
}
