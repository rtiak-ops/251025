/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
  build: {
    // 本番ビルドの最適化設定
    sourcemap: false, // 本番環境ではソースマップを無効化
    minify: 'esbuild', // 高速な圧縮
    target: 'es2015', // 広範なブラウザサポート
    rollupOptions: {
      output: {
        // コード分割の最適化
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'query-vendor': ['@tanstack/react-query'],
          'dnd-vendor': ['@hello-pangea/dnd'],
        },
      },
    },
    // チャンクサイズ警告の閾値を調整
    chunkSizeWarningLimit: 1000,
  },
  // テスト設定
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'dist/',
      ],
    },
  },
})

