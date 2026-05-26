import { create } from 'zustand'
import { persist, type StorageValue } from 'zustand/middleware'

import { taroStorage } from '../lib/taro-storage'

export type AssetKind = 'text' | 'image' | 'video'
export type TextAsset = AssetBase<'text'> & { data: { content: string } }
export type ImageAsset = AssetBase<'image'> & {
  data: {
    dataUrl: string
    storageKey?: string
    width: number
    height: number
    bytes: number
    mimeType: string
  }
}
export type VideoAsset = AssetBase<'video'> & {
  data: {
    url: string
    storageKey?: string
    width: number
    height: number
    bytes: number
    mimeType: string
  }
}
export type Asset = TextAsset | ImageAsset | VideoAsset

type AssetBase<T extends AssetKind> = {
  id: string
  kind: T
  title: string
  coverUrl: string
  tags: string[]
  source?: string
  note?: string
  createdAt: string
  updatedAt: string
  metadata?: Record<string, unknown>
}

type AssetStore = {
  assets: Asset[]
  addAsset: (
    asset: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>
  ) => string
  updateAsset: (
    id: string,
    patch: Partial<Omit<Asset, 'id' | 'createdAt'>>
  ) => void
  removeAsset: (id: string) => void
}

const ASSET_STORE_KEY = 'infinite-canvas:asset_store'

export const useAssetStore = create<AssetStore>()(
  persist(
    (set) => ({
      assets: [],
      addAsset: (asset) => {
        const now = new Date().toISOString()
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
        set((state) => ({
          assets: [
            { ...asset, id, createdAt: now, updatedAt: now } as Asset,
            ...state.assets,
          ],
        }))
        return id
      },
      updateAsset: (id, patch) =>
        set((state) => ({
          assets: state.assets.map((asset) =>
            asset.id === id
              ? ({ ...asset, ...patch, updatedAt: new Date().toISOString() } as Asset)
              : asset
          ),
        })),
      removeAsset: (id) =>
        set((state) => ({
          assets: state.assets.filter((asset) => asset.id !== id),
        })),
    }),
    {
      name: ASSET_STORE_KEY,
      storage: taroStorage,
      partialize: (state) =>
        ({ assets: state.assets }) as StorageValue<AssetStore>['state'],
    }
  )
)
