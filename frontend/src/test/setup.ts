import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// テスト後のクリーンアップを自動化
afterEach(() => {
  cleanup()
})

// グローバルなモック設定
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// LocalStorage のモック
const localStorageMock = {
  getItem: (key: string) => {
    return localStorageMock[key] || null
  },
  setItem: (key: string, value: string) => {
    localStorageMock[key] = value
  },
  removeItem: (key: string) => {
    delete localStorageMock[key]
  },
  clear: () => {
    Object.keys(localStorageMock).forEach((key) => {
      if (key !== 'getItem' && key !== 'setItem' && key !== 'removeItem' && key !== 'clear') {
        delete localStorageMock[key]
      }
    })
  },
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})
