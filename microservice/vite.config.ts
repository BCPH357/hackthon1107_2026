import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 透過 ngrok 對外時，Vite 會擋下不認得的網域；前面加點代表允許所有子網域
const ngrokHosts = ['.ngrok-free.app', '.ngrok-free.dev', '.ngrok.app', '.ngrok.dev', '.ngrok.io']

export default defineConfig({
  // 用相對路徑，打包後放在任何子路徑（Flask static、Firebase Hosting）都能開
  base: './',
  plugins: [vue()],
  build: {
    // 由 scripts/clean-dist.mjs 清空 dist：Node 24.11 在含中文的 Windows 路徑上清空資料夾會崩潰
    emptyOutDir: false,
    // 城市地圖的 Three.js 獨立成一包（約 650 KB，壓縮後 170 KB），只在打開地圖時下載
    chunkSizeWarningLimit: 700,
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: ngrokHosts,
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: ngrokHosts,
  },
})
