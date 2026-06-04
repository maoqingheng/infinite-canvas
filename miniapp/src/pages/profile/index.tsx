import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'

import { useAssetStore } from '../../stores/use-asset-store'
import { useUserStore } from '../../stores/use-user-store'
import './index.scss'

export default function ProfilePage() {
  const assets = useAssetStore((state) => state.assets)
  const user = useUserStore((state) => state.user)
  const clearSession = useUserStore((state) => state.clearSession)

  return (
    <View className="profile-page">
      <View className="profile-card">
        <Text className="profile-title">个人中心</Text>
        <Text className="profile-subtitle">
          管理本地素材、渠道配置和账号状态。
        </Text>
        <Text className="profile-notice">
          当前系统开放免费使用，可不登录使用。
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
