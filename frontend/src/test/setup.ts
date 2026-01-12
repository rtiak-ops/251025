import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

/**
 * 各テストケースの実行後に自動的に DOM をクリーンアップします。
 * これにより、テスト間での副作用を防ぎます。
 */
afterEach(() => {
  cleanup()
})

/**
 * ResizeObserver のグローバルモック
 * JSOM（テスト環境のDOM）には ResizeObserver が実装されていないため、
 * コンポーネント内で使用されている場合にエラーにならないようモック化します。
 */
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

/**
 * LocalStorage のモック
 * ブラウザの localStorage をシミュレートし、トークンの保存や取得のテストを
 * 安定して行えるようにします。
 */
const localStorageMock = (function() {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

