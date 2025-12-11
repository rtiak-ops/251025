import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    // 重要なのはこの行です！
    // これにより、Viteサーバーがコンテナ内のすべてのIP（0.0.0.0）でリッスンするようになります。
    host: true, 
  },
  plugins: [react()]
})
