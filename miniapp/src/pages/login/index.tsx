import { useEffect, useState } from 'react'
import { View, Text, Input, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useUserStore } from '../../stores/use-user-store'
import { useConfigStore } from '../../stores/use-config-store'
import { fetchCurrentUser } from '../../services/api/auth'
import './index.scss'

type FormValues = {
  username: string
  password: string
  confirmPassword: string
}

export default function LoginPage() {
  const login = useUserStore((state) => state.login)
  const register = useUserStore((state) => state.register)
  const setSession = useUserStore((state) => state.setSession)
  const isLoading = useUserStore((state) => state.isLoading)
  const linuxDoEnabled =
    useConfigStore((state) => state.publicSettings?.auth?.linuxDo?.enabled) ===
    true
  const allowRegister =
    useConfigStore((state) => state.publicSettings?.auth?.allowRegister) !==
    false

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    if (!allowRegister && mode === 'register') setMode('login')
  }, [allowRegister, mode])

  const showError = (msg: string) => {
    Taro.showToast({ title: msg, icon: 'none', duration: 2000 })
  }

  const showSuccess = (msg: string) => {
    Taro.showToast({ title: msg, icon: 'success', duration: 1500 })
  }

  const submit = async () => {
    if (!username.trim()) {
      showError('请输入用户名')
      return
    }
    if (!password) {
      showError('请输入密码')
      return
    }
    if (mode === 'register' && !allowRegister) {
      showError('当前未开放注册')
      return
    }
    if (mode === 'register' && password !== confirmPassword) {
      showError('两次输入的密码不一致')
      return
    }
    try {
      const action = mode === 'register' ? register : login
      await action({ username: username.trim(), password })
      showSuccess(mode === 'register' ? '注册成功' : '登录成功')
      Taro.switchTab({
        url: '/pages/index/index',
      }).catch(() => {
        Taro.redirectTo({ url: '/pages/index/index' })
      })
    } catch (error) {
      showError(error instanceof Error ? error.message : '登录失败')
    }
  }

  return (
    <View className="login-page">
      <View className="login-card">
        <View className="login-header">
          <Text className="login-title">账号登录</Text>
          <Text className="login-desc">支持账号密码登录。</Text>
        </View>

        <View className="mode-switch">
          {allowRegister ? (
            <View className="segmented">
              <View
                className={`segmented-item ${mode === 'login' ? 'active' : ''}`}
                onClick={() => setMode('login')}
              >
                <Text>登录</Text>
              </View>
              <View
                className={`segmented-item ${mode === 'register' ? 'active' : ''}`}
                onClick={() => setMode('register')}
              >
                <Text>注册</Text>
              </View>
            </View>
          ) : (
            <View className="segmented">
              <View className="segmented-item active">
                <Text>登录</Text>
              </View>
            </View>
          )}
        </View>

        <View className="form-item">
          <Text className="form-label">用户名</Text>
          <Input
            className="form-input"
            value={username}
            placeholder="请输入用户名"
            onInput={(e) => setUsername(e.detail.value)}
          />
        </View>

        <View className="form-item">
          <Text className="form-label">密码</Text>
          <Input
            className="form-input"
            password
            value={password}
            placeholder="请输入密码"
            onInput={(e) => setPassword(e.detail.value)}
          />
        </View>

        {mode === 'register' && (
          <View className="form-item">
            <Text className="form-label">确认密码</Text>
            <Input
              className="form-input"
              password
              value={confirmPassword}
              placeholder="请再次输入密码"
              onInput={(e) => setConfirmPassword(e.detail.value)}
            />
          </View>
        )}

        <View className="login-actions">
          <Button
            className="submit-btn"
            type="primary"
            loading={isLoading}
            disabled={isLoading}
            onClick={submit}
          >
            {mode === 'register' ? '注册' : '登录'}
          </Button>

          {linuxDoEnabled && (
            <Button
              className="linuxdo-btn"
              onClick={() => {
                // OAuth: navigate to auth URL
                Taro.showToast({
                  title: 'OAuth 登录暂不支持',
                  icon: 'none',
                })
              }}
            >
              使用 Linux.do 登录
            </Button>
          )}
        </View>
      </View>
      <View className="back-home" onClick={() => Taro.navigateTo({ url: '/pages/index/index' })}>
        <Text>←</Text>
      </View>
    </View>
  )
}
