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

城市地圖的 3D 模型取自 [Kenney City Kit Commercial 2.1](https://kenney.nl/assets/city-kit-commercial)，授權為 CC0（公眾領域），授權檔在 `public/city/KENNEY-LICENSE.txt`。

沒有使用圖示套件：

- 事件與類別的圖示在 `src/assets/icons/`。`icon_*.svg` 直接複製自 TownPass 的 `assets/svg/`，來自城市通 Figma UI Kit。
- `custom_*.svg` 是 UI Kit 沒有的概念，包括嬰兒車、輪椅、長者、照顧、公事包、蓮花。依 UI Kit 的規格自行繪製：24×24、線寬 2、圓角端點、深灰 `#434344` 搭配主色 `#2EB6C7`。
- 介面上的箭頭、電話等小圖示寫在 `src/components/AppIcon.vue`，也是自行繪製。

## 已知問題

Node.js 24.11 在 Windows 上，路徑含中文時用 `fs.rmSync` 遞迴刪除資料夾會讓程序直接結束，沒有任何錯誤訊息。Vite 打包前清空 `dist/` 用的就是它，所以 `vite.config.ts` 關閉了 `emptyOutDir`，改由 `scripts/clean-dist.mjs` 逐檔刪除。
