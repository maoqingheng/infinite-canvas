import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'

import { useAssetStore } from '../../stores/use-asset-store'
import { useUserStore } from '../../stores/use-user-store'
import './index.scss'

const LOG_STORE_KEY = 'infinite-canvas:image_generation_logs'

export default function ProfilePage() {
  const assets = useAssetStore((state) => state.assets)
  const user = useUserStore((state) => state.user)
  const clearSession = useUserStore((state) => state.clearSession)
  const [logCount, setLogCount] = useState(0)

  useDidShow(() => {
    try {
      const items = JSON.parse(Taro.getStorageSync(LOG_STORE_KEY) || '[]')
      setLogCount(Array.isArray(items) ? items.length : 0)
    } catch {
      setLogCount(0)
    }
  })

  const openImageLogs = () => {
    Taro.switchTab({ url: '/pages/image/index' })
    Taro.showToast({ title: '请在生图工作台点击查看生图记录', icon: 'none' })
  }

  const clearImageLogs = () => {
    Taro.showModal({
      title: '清空图片记录',
      content: '确定清空本地图片生成记录吗？',
      success: (result) => {
        if (!result.confirm) return
        Taro.removeStorageSync(LOG_STORE_KEY)
        setLogCount(0)
        Taro.showToast({ title: '已清空', icon: 'success' })
      },
    })
  }

  return (
    <View className="profile-page">
      <View className="profile-card">
        <Text className="profile-title">个人中心</Text>
        <Text className="profile-subtitle">
          管理本地素材、图片记录和账号状态。
        </Text>
        <View className="user-box">
          <Text className="user-name">
            {user ? user.displayName || user.username : '未登录'}
          </Text>
          <Text className="user-desc">
            {user ? `算力点：${user.credits}` : '登录后可使用远程渠道和账号额度'}
          </Text>
        </View>
      </View>

      <View className="profile-grid">
        <ProfileEntry
          title="我的素材"
          desc={`已保存 ${assets.length} 项`}
          onClick={() => Taro.navigateTo({ url: '/pages/assets/index' })}
        />
        <ProfileEntry
          title="图片记录"
          desc={`本地生成记录 ${logCount} 条`}
          onClick={openImageLogs}
        />
        <ProfileEntry
          title="渠道配置"
          desc="配置模型、API Key 和远程渠道"
          onClick={() => Taro.navigateTo({ url: '/pages/config/index' })}
        />
        <ProfileEntry
          title={user ? '退出登录' : '登录'}
          desc={user ? '清除当前账号状态' : '登录或注册账号'}
          onClick={() => {
            if (user) {
              clearSession()
              Taro.showToast({ title: '已退出登录', icon: 'success' })
            } else {
              Taro.navigateTo({ url: '/pages/login/index' })
            }
          }}
        />
      </View>

      <View className="danger-zone" onClick={clearImageLogs}>
        <Text>清空本地图片记录</Text>
      </View>
    </View>
  )
}

function ProfileEntry({
  title,
  desc,
  onClick,
}: {
  title: string
  desc: string
  onClick: () => void
}) {
  return (
    <View className="profile-entry" onClick={onClick}>
      <Text className="entry-title">{title}</Text>
      <Text className="entry-desc">{desc}</Text>
    </View>
  )
}
