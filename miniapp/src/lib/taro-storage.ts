import Taro from '@tarojs/taro'
import type { PersistStorage, StorageValue } from 'zustand/middleware'

export const taroStorage: PersistStorage<unknown> = {
  getItem: async (name: string) => {
    try {
      const res = await Taro.getStorage({ key: name })
      return res.data ? (JSON.parse(res.data) as StorageValue<unknown>) : null
    } catch {
      return null
    }
  },
  setItem: async (name: string, value: StorageValue<unknown>) => {
    await Taro.setStorage({ key: name, data: JSON.stringify(value) })
  },
  removeItem: async (name: string) => {
    await Taro.removeStorage({ key: name })
  },
}
