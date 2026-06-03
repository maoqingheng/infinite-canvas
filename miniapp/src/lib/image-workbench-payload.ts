import Taro from '@tarojs/taro'

export type ImageWorkbenchPayload = {
  prompt?: string
  styleRef?: string
  styleName?: string
  templateRef?: string
  templateName?: string
}

const IMAGE_WORKBENCH_PAYLOAD_KEY = 'infinite-canvas:image_workbench_payload'

export function setImageWorkbenchPayload(payload: ImageWorkbenchPayload) {
  Taro.setStorageSync(IMAGE_WORKBENCH_PAYLOAD_KEY, payload)
}

export function takeImageWorkbenchPayload() {
  const payload = Taro.getStorageSync(
    IMAGE_WORKBENCH_PAYLOAD_KEY
  ) as ImageWorkbenchPayload | ''
  Taro.removeStorageSync(IMAGE_WORKBENCH_PAYLOAD_KEY)
  return payload || null
}
