import { apiGet, compactApiParams } from './request'

export type Style = {
  id: number
  name: string
  coverUrl: string
  activeStylesCount: number
  createdAt: string
  updatedAt: string
}

export type StyleDetail = {
  id: number
  categoryId: number
  name: string
  logo: string
  fePrompt: string
  isHot: number
  sort: number
  createdAt: string
  updatedAt: string
}

export type StyleListResponse = {
  items: Style[]
  total: number
}

export type StyleDetailListResponse = {
  items: StyleDetail[]
  total: number
}

export async function fetchStyles({
  keyword,
  page,
  pageSize,
}: {
  keyword?: string
  page?: number
  pageSize?: number
} = {}) {
  return apiGet<StyleListResponse>(
    '/api/styles',
    compactApiParams({
      ...(keyword ? { keyword } : {}),
      ...(page ? { page } : {}),
      ...(pageSize ? { pageSize } : {}),
    })
  )
}

export async function fetchStyleDetails(
  categoryId: number,
  {
    keyword,
    isHot,
    page,
    pageSize,
  }: {
    keyword?: string
    isHot?: number
    page?: number
    pageSize?: number
  } = {}
) {
  return apiGet<StyleDetailListResponse>(
    `/api/styles/${categoryId}/details`,
    compactApiParams({
      ...(keyword ? { keyword } : {}),
      ...(isHot ? { ishot: isHot } : {}),
      ...(page ? { page } : {}),
      ...(pageSize ? { pageSize } : {}),
    })
  )
}
