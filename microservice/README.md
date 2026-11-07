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

## 部署（Cloudflare Pages）

正式網址：**https://townpass-life-events.pages.dev/**

微服務目前全是靜態網頁，放在 Cloudflare Pages：網址固定、自動 HTTPS、免費方案就夠用，不需要自己的電腦一直開著。台北通 App 的「一步一步來」預設就開這個網址。

更新上線：

```bash
cd microservice
npm run deploy:login   # 第一次需要：瀏覽器登入 Cloudflare 並按 Allow
npm run deploy         # 型別檢查、打包，再上傳到 Cloudflare Pages
```

- 專案名稱是 `townpass-life-events`，寫在 `scripts/deploy.mjs`。這個網址屬於建立它的 Cloudflare 帳號；隊友要更新同一個網址，請帳號擁有者在 Cloudflare 後台把隊友加為帳號成員。
- 換到新帳號重建專案時，wrangler 4.158 需要加 `--force` 才會建立原本的 Pages 專案（不加會轉成 Workers 而失敗）：`npx wrangler pages project create 專案名稱 --production-branch main --force`，只有建立時需要。
- 使用者填的身分只存在手機的 localStorage，Pages 只放靜態檔，不會收到任何個人資料。
- 路由用 hash（`#/events`），所以不需要設定單頁應用的轉址規則。

## 用自己的電腦對外（開發測試用）

iPhone 與 Android 都不允許 http，要用 https 網址。想在手機上看還沒部署的修改，或之後有 Flask 後端要從自己電腦對外時，用 Cloudflare 通道：

```bash
npm run build
npm run preview                                          # http://localhost:4173
cloudflared tunnel --no-autoupdate --url http://localhost:4173
```

終端機會印出一個 `https://xxxx.trycloudflare.com` 網址，沒有 ngrok 免費版的警告頁。快速通道**每次重開網址都會變**，Cloudflare 也標明只供測試。建置台北通 App 時帶入這個網址，會蓋過預設的 Pages 網址：

```bash
fvm flutter run --dart-define=LIFE_EVENTS_URL=https://xxxx.trycloudflare.com/
```

`vite.config.ts` 已允許 `trycloudflare.com` 與 ngrok 的所有子網域；ngrok 仍可當備案。要固定網址的通道，需要一個掛在 Cloudflare 的網域，用 `cloudflared tunnel login`、`create`、`route dns`、`run --url` 建立命名通道。

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

## 城市地圖

每一頁右下角都有「城市地圖」按鈕（`src/components/CityLink.vue`），網址是 `#/city`。九個類別各是一棟大樓，依主題分四色：家庭（橘）、照顧與健康（藍綠）、工作與居住（黃）、身後事（灰），顏色全部取自 TownPass 色票。點大樓或標籤會從底部滑出抽屜，列出這一類的事與進度。

- 從事件或步驟頁點按鈕，會帶著 `?cat=類別` 進來，直接打開那件事所在的大樓。
- 進度和清單共用 `stores/progress`：在步驟頁打勾，地圖上的標籤與抽屜跟著更新。
- 選取的類別記在網址，Android 返回鍵會先關抽屜。
- 標籤是真正的按鈕，鍵盤與讀屏都能操作。字放大到 125% 以上，或螢幕太窄排不開時，標籤改排在地圖下方。
- 手機不支援 WebGL 2 或模型載入失敗時，只顯示類別按鈕，功能照常。
- 開啟「減少動態效果」時不播放大樓長出來與鏡頭移動的動畫。

程式在 `src/city/`：

| 檔案 | 內容 |
| --- | --- |
| `config.ts` | 主題配色、九棟大樓的模型與位置、背景天際線與樹 |
| `scene.ts` | Three.js 場景、鏡頭、點選與動畫；只在畫面需要變化時才重畫 |
| `textures.ts` | 依主題重畫模型貼圖的牆面與招牌顏色 |
| `progress.ts` | 每個類別的進度與推薦 |

模型在 `public/city/models/`，取自 Kenney City Kit Commercial 2.1，總共約 1.5 MB。套件附的 `variation-a.png` 已改名為模型指定的 `Textures/colormap.png`。要換模型時，請挑淺色外牆的款式：`building-h` 這類外牆是固定的深灰磚，換不了色。

Three.js 打包成獨立的檔案（壓縮後約 170 KB），只有打開城市地圖時才會下載。

## 第三方套件

| 套件 | 版本 | 授權 |
| --- | --- | --- |
| vue | 3.5 | MIT |
| vue-router | 4.6 | MIT |
| vite | 7.3 | MIT |
| @vitejs/plugin-vue | 6.0 | MIT |
| typescript | 5.9 | Apache-2.0 |
| vue-tsc | 3.3 | MIT |
| three | 0.187 | MIT |
| @types/three | 0.187 | MIT |
| wrangler（只用來部署，不會打包進網頁） | 4.158 | MIT 或 Apache-2.0 |

城市地圖的 3D 模型取自 [Kenney City Kit Commercial 2.1](https://kenney.nl/assets/city-kit-commercial)，授權為 CC0（公眾領域），授權檔在 `public/city/KENNEY-LICENSE.txt`。

沒有使用圖示套件：

- 事件與類別的圖示在 `src/assets/icons/`。`icon_*.svg` 直接複製自 TownPass 的 `assets/svg/`，來自城市通 Figma UI Kit。
- `custom_*.svg` 是 UI Kit 沒有的概念，包括嬰兒車、輪椅、長者、照顧、公事包、蓮花。依 UI Kit 的規格自行繪製：24×24、線寬 2、圓角端點、深灰 `#434344` 搭配主色 `#2EB6C7`。
- 介面上的箭頭、電話等小圖示寫在 `src/components/AppIcon.vue`，也是自行繪製。

## 已知問題

Node.js 24.11 在 Windows 上，路徑含中文時用 `fs.rmSync` 遞迴刪除資料夾會讓程序直接結束，沒有任何錯誤訊息。Vite 打包前清空 `dist/` 用的就是它，所以 `vite.config.ts` 關閉了 `emptyOutDir`，改由 `scripts/clean-dist.mjs` 逐檔刪除。同樣的原因，`scripts/deploy.mjs` 從系統暫存資料夾執行 wrangler，否則部署或登入完成後會以 127 結束。
