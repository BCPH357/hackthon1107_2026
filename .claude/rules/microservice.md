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
- 正式網址是 Cloudflare Pages（https://townpass-life-events.pages.dev/），改完用 `npm run deploy` 上傳；部署前先跑過建置與測試
- Android 版 App 不允許 http（Manifest 沒開 cleartext），在 App 內測試未部署的修改時，用 Cloudflare 快速通道（或 ngrok）的 https 網址
- 透過通道對外時，網域要在 `vite.config.ts` 的 `tunnelHosts` 裡（已含 `.trycloudflare.com` 與 ngrok），否則請求會被 Vite 擋下；改用自己的網域要記得加
- 若改回免費版 ngrok：它會先顯示警告頁，fetch 時要加上 `ngrok-skip-browser-warning` header；Cloudflare 沒有警告頁
- 色票與字級以 `lib/util/tp_colors.dart`、`lib/util/tp_text_styles.dart` 為準，字體用 PingFang TC
- 觸控目標至少 48×48px；文字放大到 200% 時版面不能破掉
- 城市地圖（`src/city/`）的 Kenney 模型用調色盤貼圖，只有牆面、招牌（商業大樓）或屋頂（住宅）會依主題重畫；換模型時要挑淺色外牆的款式，外牆是固定深灰磚的（例如 `building-h`）換不了色。不同套件的模型要放在各自的資料夾，因為它們都指向同名的 `Textures/colormap.png`
- 城市地圖的 Three.js 只能在 `CityView` 這條延遲載入的路由裡 import，否則會打包進主程式，所有頁面都變慢
- AR 方向指引（`ArDirectionView`）的相機與方向感測器請求，必須在點擊事件裡同步送出（不能先 await 別的東西），否則 iPhone 直接拒絕；離開頁面或切到背景時一定要 `closeCamera`
- `DeviceOrientationEvent.requestPermission` 回答「拒絕」不代表收不到數值（新版 Chrome 也有這個 API），一律先監聽，逾時沒數值才判定
- 步驟的每一張資源卡片（ResourceDef）都要有 `sources`，指向對應內容的官方網頁，網址加在 `src/data/sources.ts`；有 AR 地點的步驟，資源裡要有附臺北資料大平台資料集的卡片（`districtOffice()`、`householdOffice()`、`cityHospital()`）
- 地點座標只能來自 `src/data/places.json`（`node scripts/fetch-places.mjs` 從臺北資料大平台產生），開放資料沒有的地點不要手動補座標，寫進 `missing` 由畫面說明
