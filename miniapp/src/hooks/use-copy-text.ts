import Taro from '@tarojs/taro'

export function useCopyText() {
  return (text: string, successMsg = '已复制') => {
    Taro.setClipboardData({ data: text })
      .then(() => {
        Taro.showToast({ title: successMsg, icon: 'success', duration: 1500 })
      })
      .catch(() => {
        Taro.showToast({ title: '复制失败', icon: 'none', duration: 1500 })
      })
  }
}
