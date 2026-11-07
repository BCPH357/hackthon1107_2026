---
paths:
  - "microservice/**/*"
---

# 微服務前端（在城市通 WebView 中執行）

- 與 App 溝通用 `window.flutterObject`：送出用 `postMessage(JSON.stringify({ name, data }))`；`addEventListener('message', ...)` 收到的 `event.data` 也是 JSON 字串，要先 `JSON.parse`
- 可用的 `name` 以 `lib/util/web_message_handler/tp_web_message_handler.dart` 裡各 Handler 的 `name` 為準
- 呼叫前先判斷 `window.flutterObject` 是否存在，不存在（一般瀏覽器）時回傳模擬資料，讓桌機 Chrome 也能開發
- 元件卸載時用 `removeEventListener` 移除監聽，避免重複觸發
- 外部連結用 `open_link`，不要用 `window.open` 或 `target="_blank"`：WebView 沒有開啟多視窗
- Android 版 App 不允許 http（Manifest 沒開 cleartext），在 App 內測試一律用 ngrok 的 https 網址
- 透過 ngrok 開 Vite dev server 時，要把 ngrok 網域加進 `vite.config.ts` 的 `server.allowedHosts`，否則請求會被 Vite 擋下
- 免費版 ngrok 會先顯示警告頁，fetch 時加上 `ngrok-skip-browser-warning` header
- 色票與字級以 `lib/util/tp_colors.dart`、`lib/util/tp_text_styles.dart` 為準，字體用 PingFang TC
- 觸控目標至少 48×48px；文字放大到 200% 時版面不能破掉
- 城市地圖（`src/city/`）的模型共用一張調色盤貼圖，只有牆面與招牌兩塊會依主題重畫；換模型時要挑淺色外牆的款式，外牆是固定深灰磚的（例如 `building-h`）換不了色
- 城市地圖的 Three.js 只能在 `CityView` 這條延遲載入的路由裡 import，否則會打包進主程式，所有頁面都變慢
