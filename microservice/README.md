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

## 無障礙

- **字級與對比**：首頁按「開始」後先選一次，之後每一頁上方的「字級與對比」都能再調。字級有標準、大、特大、最大四段，分別是 100%、125%、150%、200%；版面全用 rem，改 `html` 的字級就整頁放大。設定存在手機上，清除個人資料時不會被清掉。邏輯在 `src/stores/display.ts`。
- **高對比**：只換文字、框線、圖示用的色票，卡片改成深色框線。手機開了「增加對比」時，第一次打開會自動套用。樣式在 `src/styles/base.css` 最下面。
- **易讀版**：步驟清單與步驟詳情上方的「易讀版」一鍵切換，設定頁也能選，切換後會記住。開啟時「要做什麼」改成照順序編號的短句、準備清單與地點改用白話寫法，「可以用的資源」收進「看更多」。文字集中在 `src/data/easyRead.ts`，沒寫易讀版的欄位會沿用一般版。
- **朗讀（目前只支援 iPhone）**：步驟詳情的「朗讀這一步」依序念出第幾步、要做什麼、要準備什麼、去哪裡辦，念到哪一段就框起來；開著易讀版就念易讀文字。用瀏覽器內建的 Web Speech API，聲音來自手機系統的語音引擎，不經過雲端。專線號碼逐字念（1999 念成「一九九九」）。換頁、切到別的 App 或按停止都會停。邏輯在 `src/services/speech.ts`。
  - Android 的 WebView 多半沒有語音可用，這時按鈕自動隱藏。要支援 Android，需在台北通 App 加朗讀 Handler（flutter_tts，MIT），並在 AndroidManifest 宣告 `android.intent.action.TTS_SERVICE`。
- **讀屏**：換頁後焦點會移到新頁面的大標題，VoiceOver／TalkBack 會念出新頁面。選項都是原生 checkbox／radio。
- **檢查方式**：每次改版用 axe-core 掃過每一頁的 WCAG 2.2 A／AA 規則，標準與高對比兩種模式都要零問題；另外用 Playwright 檢查 375、402、440 寬與最大字級時不會橫向捲動或把字擠成一字一行。實機的 VoiceOver 與 TalkBack 仍需人工走一次。

## 資料

- 人生事件、步驟與資源在 `src/data/lifeEvents.ts`，目前是**劇情草稿，尚未逐條對照官方資料**，畫面上已標示「示範內容」。
- 易讀版文字在 `src/data/easyRead.ts`，**開發時由 AI（Claude）起草的固定文字**，執行時不呼叫任何 AI。尚待團隊逐條審稿，最好請長者或理解有困難的人實際讀一次。
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

沒有使用圖示套件：

- 事件與類別的圖示在 `src/assets/icons/`。`icon_*.svg` 直接複製自 TownPass 的 `assets/svg/`，來自城市通 Figma UI Kit。
- `custom_*.svg` 是 UI Kit 沒有的概念，包括嬰兒車、輪椅、長者、照顧、公事包、蓮花。依 UI Kit 的規格自行繪製：24×24、線寬 2、圓角端點、深灰 `#434344` 搭配主色 `#2EB6C7`。
- 介面上的箭頭、電話等小圖示寫在 `src/components/AppIcon.vue`，也是自行繪製。

## 已知問題

Node.js 24.11 在 Windows 上，路徑含中文時用 `fs.rmSync` 遞迴刪除資料夾會讓程序直接結束，沒有任何錯誤訊息。Vite 打包前清空 `dist/` 用的就是它，所以 `vite.config.ts` 關閉了 `emptyOutDir`，改由 `scripts/clean-dist.mjs` 逐檔刪除。
