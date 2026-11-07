import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// 透過 ngrok 或 Cloudflare Tunnel 對外時，Vite 會擋下不認得的網域；前面加點代表允許所有子網域
const ngrokHosts = [
  '.ngrok-free.app',
  '.ngrok-free.dev',
  '.ngrok.app',
  '.ngrok.dev',
  '.ngrok.io',
  // cloudflared tunnel --url 產生的臨時網址
  '.trycloudflare.com',
]

export default defineConfig(({ mode }) => {
  // 第三個參數給空字串：連同沒有 VITE_ 前綴的環境變數（例如 BACKEND_PORT）一起讀
  const env = loadEnv(mode, '.', '')

  // /api 轉發到本機的 Flask 後端（backend/），同一條 ngrok／Cloudflare 通道就能同時提供前端與 API。
  // macOS 的 AirPlay 接收器會占用 5000，這時後端改用別的埠，並用 BACKEND_PORT 告訴 Vite
  const apiProxy = {
    '/api': { target: `http://localhost:${env.BACKEND_PORT || '5000'}`, changeOrigin: true },
  }

  return {
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
      proxy: apiProxy,
    },
    preview: {
      host: true,
      port: 4173,
      allowedHosts: ngrokHosts,
      proxy: apiProxy,
    },
  }
})
