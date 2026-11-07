# 一步一步來（城市通微服務）

在城市通 WebView 中開啟的微服務網頁。使用者先說明自己或家人的情況，再選要辦的人生事件，服務會列出照順序排好的步驟，以及每一步可以用的政府資源與台北通服務。劇情與範圍見 [`docs/story-plan.md`](../docs/story-plan.md)。

服務名稱「一步一步來」是暫定名稱，改 `src/config.ts` 的 `APP_NAME` 即可。

## 執行

需要 Node.js 20.19 以上或 22.12 以上。

```bash
cd microservice
npm install
npm run dev        # 開發，http://localhost:5173
npm run build      # 型別檢查並打包到 dist/
npm run preview    # 預覽打包結果，http://localhost:4173
```

在一般瀏覽器開啟時沒有城市通 App，會用模擬資料，並在畫面上方顯示模擬的標題列。用 Chrome DevTools 的裝置模擬（例如寬 402px）就能檢查手機版面。

## 在城市通 App 裡測試

Android 版 App 不允許 http，一律用 ngrok 的 https 網址。

```bash
npm run dev
ngrok http 5173
```

`vite.config.ts` 已允許所有 ngrok 子網域，不必每次修改。把 ngrok 給的網址填進 TownPass 的 `lib/page/city_service/model/my_service_model.dart` 對應服務的 `destinationUrl`。

## 與 App 的溝通

都寫在 `src/services/townpass.ts`，用到的 App 能力如下：

| name | 用途 |
| --- | --- |
| `userinfo` | 幫自己辦時，帶入年齡、是否設籍臺北、居住行政區、是否為原住民 |
| `phone_call` | 撥打 1999、1966 等專線 |
| `open_link` | 開啟台北通內的其他服務，以及 OpenStreetMap 地圖搜尋 |

## 資料

- 人生事件、步驟與資源在 `src/data/lifeEvents.ts`，目前是**劇情草稿，尚未逐條對照官方資料**，畫面上已標示「示範內容」。
- 台北通服務清單在 `src/data/townpassServices.ts`，對應 TownPass 的 `my_service_model.dart`。網址為空的服務在 App 中也尚未開放，畫面會標示「尚未開放」。
- 使用者填的身分與進度只存在手機的 localStorage，不會上傳。
- 地圖只連到 OpenStreetMap。

## 第三方套件

| 套件 | 版本 | 授權 |
| --- | --- | --- |
| vue | 3.5 | MIT |
| vue-router | 4.6 | MIT |
| vite | 7.3 | MIT |
| @vitejs/plugin-vue | 6.0 | MIT |
| typescript | 5.9 | Apache-2.0 |
| vue-tsc | 3.3 | MIT |

圖示為自行繪製的 SVG，沒有使用圖示套件。

## 已知問題

Node.js 24.11 在 Windows 上，路徑含中文時用 `fs.rmSync` 遞迴刪除資料夾會讓程序直接結束，沒有任何錯誤訊息。Vite 打包前清空 `dist/` 用的就是它，所以 `vite.config.ts` 關閉了 `emptyOutDir`，改由 `scripts/clean-dist.mjs` 逐檔刪除。
