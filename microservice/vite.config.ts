import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import pkg from './package.json'

// 從自己電腦對外（Cloudflare Tunnel 或 ngrok）時，Vite 會擋下不認得的網域；前面加點代表允許所有子網域。
// 改用 Cloudflare 命名通道接自己的網域時，把網域加在這裡，例如 '.example.com'。
const tunnelHosts = [
  // Cloudflare 快速通道：cloudflared tunnel --url http://localhost:4173
  '.trycloudflare.com',
  // ngrok
  '.ngrok-free.app',
  '.ngrok-free.dev',
  '.ngrok.app',
  '.ngrok.dev',
  '.ngrok.io',
]

export default defineConfig(({ command, mode }) => {
  // 第三個參數給空字串：連同沒有 VITE_ 前綴的環境變數（例如 BACKEND_PORT）一起讀
  const env = loadEnv(mode, '.', '')

  // Pages 與 App 內的離線版都只放靜態檔，沒指定 VITE_API_BASE 時交棒會失敗（PUT 回 405），打包時提醒
  if (command === 'build' && !env.VITE_API_BASE) {
    console.warn(
      '\n⚠ 沒有設定 VITE_API_BASE：交棒同步會呼叫相對路徑 api/…，只有 npm run preview 透過 proxy 能用。\n' +
        '  要部署到 Cloudflare Pages 或打包進 App，請加上 Flask 的對外網址，例如：\n' +
        '  VITE_API_BASE=https://xxxx.trycloudflare.com npm run deploy\n',
    )
  }

  // 沒設定 VITE_API_BASE 時（dev／preview），/api 轉發到本機的 Flask 後端（backend/），同一條通道就能同時提供前端與 API。
  // macOS 的 AirPlay 接收器會占用 5000，這時後端改用別的埠，並用 BACKEND_PORT 告訴 Vite
  const apiProxy = {
    '/api': { target: `http://localhost:${env.BACKEND_PORT || '5000'}`, changeOrigin: true },
  }

  return {
    // 用相對路徑，打包後放在任何子路徑（Flask static、Firebase Hosting）都能開
    base: './',
    // 版本號只寫在 package.json 的 version，打包時帶進網頁（src/config.ts 的 APP_VERSION）
    define: { __APP_VERSION__: JSON.stringify(pkg.version) },
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
      allowedHosts: tunnelHosts,
      proxy: apiProxy,
    },
    preview: {
      host: true,
      port: 4173,
      allowedHosts: tunnelHosts,
      proxy: apiProxy,
    },
  }
})
