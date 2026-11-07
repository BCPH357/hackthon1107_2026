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

微服務的網頁放在 Cloudflare Pages：網址固定、自動 HTTPS、免費方案就夠用，不需要自己的電腦一直開著。台北通 App 的「一步一步來」預設就開這個網址。

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
- Pages 只放靜態檔，沒有後端（對 `api/…` 送 PUT 會回 405，畫面顯示「伺服器發生問題」）。交棒同步要呼叫 Flask 後端（`backend/`），部署前要把 Flask 開成對外網址，建置時用 `VITE_API_BASE` 帶入；App 內的離線版（`npm run build:app`）也一樣：

  ```bash
  # 1. 開 Flask，允許 Pages 與 App 離線版兩個來源（macOS 的 5000 被 AirPlay 占用，改用 5001）
  cd backend
  PORT=5001 ALLOWED_ORIGINS=https://townpass-life-events.pages.dev,http://127.0.0.1:43862 python3 app.py
  # 2. 另開終端機，給 Flask 一條快速通道，記下印出的 https://xxxx.trycloudflare.com
  cloudflared tunnel --no-autoupdate --url http://localhost:5001
  # 3. 帶入通道網址部署（打包進 App 時改成 npm run build:app，同樣要帶）
  cd microservice
  VITE_API_BASE=https://xxxx.trycloudflare.com npm run deploy
  ```

  通道網址每次重開都會變，變了就重跑第 3 步；App 不用重新建置（離線版例外，要重跑 `build:app` 再建置 App）。案件只存在 Flask 的記憶體，Flask 重開後要請長輩再交棒一次。
- 城市嚮導的裝置端 AI 問答只在 App 內打包的離線版啟用（根目錄 README 的「城市嚮導離線版」）；建置 App 前沒跑 `npm run build:app` 的話，App 會開正式網址，嚮導的 AI 問答不會出現。

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
| `open_link` | 開啟台北通內的其他服務、OpenStreetMap 地圖搜尋與步行路線、資料來源網頁 |
| `location` | AR 方向指引取得目前位置（使用中每 5 秒更新一次）；一般瀏覽器改用 `navigator.geolocation` |

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
- 婚姻與家庭、身心障礙、就業與經濟三類共 14 件事，步驟放在 `src/data/categories/`（`family.ts`、`disability.ts`、`work.ts`），依內政部戶政司、司法院、衛福部、臺北市社會局、就業服務處、勞動力重建運用處、公共運輸處等官方公開資料整理，各檔開頭列出來源機關與查詢日期（2026-11-07）。金額只寫官方標明適用年度的，各機關說法不一致的地方請使用者先打電話確認。內容由 AI 依官方資料起草，畫面仍標示「示範內容」，需要團隊逐條核對。這三類的易讀版直接寫在每一步的 `easy` 欄位，和一般版放在一起方便對照。
- 「家暴求助」是隱私事件（`EventDef.sensitive`）：同住的家人可能就是加害人，所以不記住上次打開、打勾進度不存進手機、不能交給家人、不列在「常見的事」和推薦裡，頁面上方固定有 110、113 和「快速離開」。
- 步驟裡的台北通服務可以直接開到某個櫃檯或表單，例如臨櫃叫號的戶政事務所、區公所、就業服務站，以及申辦服務的家暴被害人補助、原住民急難關懷慰問金，網址在 `src/data/townpassServices.ts`，2026-11-07 逐一點開確認過。
- 台北通服務清單在 `src/data/townpassServices.ts`，對應 TownPass 的 `my_service_model.dart`。網址為空的服務在 App 中也尚未開放，畫面會標示「尚未開放」。
- 「去哪裡辦」AR 方向指引的地點在 `src/data/places.json`，**全部來自臺北資料大平台**，授權為政府資料開放授權條款－第1版：
  - [臺北市公廁點位資訊](https://data.taipei/dataset/detail?id=ca205b54-a06f-4d84-894c-d6ab5079ce79)：區公所、戶政事務所、聯醫院區的經緯度。公廁以所在建物登記，所以用機關建物內公廁的座標代表機關位置。
  - [臺北市各區戶政事務所等候人數](https://data.taipei/dataset/detail?id=3b9856c9-d26b-4089-95ad-bc4c5908461e)：戶政事務所的正式名稱、地址與電話。戶政事務所沒有自己的公廁紀錄時，用同一棟建物（地址相同、不看樓層）的座標。
  - 目前有 11 個區公所、11 個戶政事務所、7 個聯醫院區（不含中醫、門診部與昆明院區）。北投區公所與北投區戶政事務所在開放資料裡找不到座標，程式不猜，畫面會說明並提供地圖搜尋。
  - 更新資料：在 `microservice/` 執行 `node scripts/fetch-places.mjs`，會重新下載並覆寫 `places.json`，印出各類數量與缺座標的地點。網頁執行時不連 data.taipei，比賽現場網路不穩也能用。
- 步驟頁「可以用的資源」的每一張卡片下方都有「資料來源」，點了用台北通開官方網頁，網址集中在 `src/data/sources.ts`（2026-11-07 逐一打開確認過）。區公所、戶政事務所、聯醫的卡片另外附上 AR 地點用的臺北資料大平台資料集，開放資料的出處放在這裡，不放在 AR 頁面。新增資源時一定要附上對應的來源。
- 使用者填的身分與進度只存在手機的 localStorage，不會上傳。
- 地圖只連到 OpenStreetMap。

## 城市地圖

每一頁右下角都有「城市地圖」按鈕（`src/components/CityLink.vue`），網址是 `#/city`。九個類別各是一棟大樓，依主題分四色：家庭（橘）、照顧與健康（藍綠）、工作與居住（黃）、身後事（灰），顏色全部取自 TownPass 色票。點大樓或標籤會從底部滑出抽屜，列出這一類的事與進度。

- 手機上單指拖曳移動、兩指捏合縮放、兩指轉動旋轉；電腦上滾輪縮放、右鍵拖曳旋轉。地圖下方有縮小、放大、逆時針、順時針、回到原本視角的按鈕，不會雙指操作也能用。
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

每棟大樓都有自己的特色，讓人一眼認出是哪一類：

- 婚姻與家庭、居住是獨棟住宅，屋頂是主題色，前院立著類別圖示的招牌
- 傷病與醫療的屋頂有紅十字直升機坪、正面掛紅十字招牌，右側路上停著救護車
- 其他大樓正面掛著類別圖示的招牌，圖示和介面用的是同一套 TownPass 圖示
- 身後事旁種了樹；街上有計程車、轎車與路燈

模型總共約 2.1 MB，依套件放在 `public/city/` 底下的資料夾，每個資料夾有自己的 `Textures/colormap.png`：

| 資料夾 | Kenney 套件 | 用途 |
| --- | --- | --- |
| `models/` | City Kit Commercial 2.1 | 七棟主角大樓、背景天際線、陽傘 |
| `suburban/` | City Kit Suburban | 兩棟住宅 |
| `cars/` | Car Kit | 救護車、計程車、轎車 |
| `roads/` | City Kit Roads | 路燈 |

主角大樓與住宅的牆面、招牌、屋頂會依主題重畫顏色（`src/city/textures.ts`），車輛與路燈保留原色。`models/Textures/colormap.png` 是套件附的 `variation-a.png` 改名而來。要換模型時，請挑淺色外牆的款式：`building-h` 這類外牆是固定的深灰磚，換不了色。

Three.js 打包成獨立的檔案（壓縮後約 170 KB），只有打開城市地圖時才會下載。

## AR 方向指引

步驟的「去哪裡辦」是區公所、戶政事務所或聯醫院區時（`WhereDef.placeType`），會出現「用 AR 找方向」，打開 `#/events/<事件>/steps/<步驟>/ar`。目前有六個步驟：失智症就醫確認、身障證明申請／醫院鑑定／領取證明、出生登記、死亡登記。

- **怎麼用**：手機直拿，相機畫面上的大箭頭指向目的地，距離顯示在上方；慢慢轉身，對準到正負 12 度內箭頭變綠色、寫「就在前方」，目的地落在鏡頭範圍內時畫面上會浮出名稱標記。Android 對準時會短震一下。
- **不看畫面也能用**：方向同時寫成句子，例如「大安區公所在你的右前方，大約 2 點鐘方向，直線距離約 600 公尺」。方向或距離（每 100 公尺）改變時由讀屏主動念出，至少間隔 3 秒；也可以按「念出方向」。
- **去哪一個**：區公所預設去戶籍地那一區（身障證明要在戶籍地申請），戶政事務所與聯醫院區預設去最近的，都可以用「換一個地點」改。旁邊會標示「你的戶籍地」「離你最近」。
- **箭頭是直線方向，不是路線**：畫面上提醒走路要抬頭看路；要看怎麼走，按「看走路路線」開 OpenStreetMap 的步行路線。
- **退場**：

  | 情況 | 畫面 |
  | --- | --- |
  | 不想開相機、相機權限被拒、手機不支援 | 改成指南針錶盤，北方標記跟著真實的北方轉 |
  | 相機被來電、其他 App 或系統中斷 | 自動重開一次（暫時找不到相機時再等一下重試）；10 秒內又中斷就改用錶盤並說明 |
  | 3 秒內收不到方向感測器的數值 | 說明沒有指南針（或權限被拒），改用「在你的東北方」這種東西南北說法 |
  | iPhone 回報指南針誤差大於 25 度 | 提示在空中畫 8 字形校正 |
  | 取不到位置 | 以臺北市政府當起點示範，標示「示範位置」 |
  | 人不在臺北市 | 提示距離會很遠，可以改用示範位置 |
  | 定位誤差大於 100 公尺 | 提示方向僅供參考 |
  | 手機橫拿 | 請使用者直拿（iPhone 的指南針以直拿為準） |
  | 一般瀏覽器沒有指南針 | 出現「模擬手機面向」滑桿，方便在電腦上開發與展示 |

- **隱私**：相機畫面只顯示在手機上，不錄影、不上傳、不做影像辨識；切到背景或離開頁面時立即關閉相機。位置只用來算方向和距離，不儲存。
- **程式**：`src/views/ArDirectionView.vue`（流程與文字）、`src/components/ArViewport.vue`（相機畫面與箭頭）、`src/services/compass.ts`（iPhone 用 `webkitCompassHeading`，Android 用 `deviceorientationabsolute` 依 W3C 算法換成手機背面的方位，並做平滑處理）、`src/services/camera.ts`、`src/utils/geo.ts`（距離、方位角、方向說法）、`src/data/places.ts`。整頁獨立打包，只有打開時才下載。

台北通 App 端的配合（`lib/util/tp_web_view.dart`、`ios/Runner/Info.plist`）：

- WebView 開啟 `allowsInlineMediaPlayback`，否則 iPhone 會把相機畫面切成全螢幕播放。
- `onPermissionRequest` 只放行本服務網址（`townpass-life-events.pages.dev` 與它的預覽網址、`*.trycloudflare.com`、`localhost`）的相機與方向感測器，其他網站或麥克風一律拒絕，和原本沒設定時的行為相同。iPhone 第一次仍會跳出系統的相機權限詢問。
- `NSCameraUsageDescription` 改成中文，說明掃 QR Code 與 AR 方向指引都會用到相機。
- **Android 限制**：WebView 放行相機的前提是台北通本身已經有相機權限。App 目前只在掃 QR Code 時才向使用者要相機權限，還沒掃過的話，AR 畫面會說明並改用錶盤。

實機測試要看的地方（Chrome 已用假相機、假定位、合成的感測器事件自動測過，下列只能在手機上確認）：

1. 第一次按「開啟相機找方向」時，台北通若還沒有相機或定位權限，iOS 會跳出系統詢問（相機的說明文字是新改的中文）；網頁的相機與方向權限由 App 直接放行，不會再多跳詢問。相機畫面在頁面內播放，不是全螢幕。
2. 站在戶外轉一圈，箭頭的方向與 OpenStreetMap 上目的地的方向一致；對準時變綠。
3. 走 50 到 100 公尺，距離會跟著變。
4. 切到別的 App 再回來，相機會重新開啟；離開頁面後相機指示燈熄滅。
5. 開 VoiceOver，轉身時會念出新的方向。

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

城市地圖的 3D 模型取自 Kenney 的 [City Kit Commercial](https://kenney.nl/assets/city-kit-commercial)、[City Kit Suburban](https://kenney.nl/assets/city-kit-suburban)、[Car Kit](https://kenney.nl/assets/car-kit)、[City Kit Roads](https://kenney.nl/assets/city-kit-roads)，授權皆為 CC0（公眾領域），授權檔在 `public/city/KENNEY-LICENSE.txt`。

沒有使用圖示套件：

- 事件與類別的圖示在 `src/assets/icons/`。`icon_*.svg` 直接複製自 TownPass 的 `assets/svg/`，來自城市通 Figma UI Kit。
- `custom_*.svg` 是 UI Kit 沒有的概念，包括嬰兒車、輪椅、長者、照顧、公事包、蓮花。依 UI Kit 的規格自行繪製：24×24、線寬 2、圓角端點、深灰 `#434344` 搭配主色 `#2EB6C7`。
- 介面上的箭頭、電話等小圖示寫在 `src/components/AppIcon.vue`，也是自行繪製。

## 已知問題

Node.js 24.11 在 Windows 上，路徑含中文時用 `fs.rmSync` 遞迴刪除資料夾會讓程序直接結束，沒有任何錯誤訊息。Vite 打包前清空 `dist/` 用的就是它，所以 `vite.config.ts` 關閉了 `emptyOutDir`，改由 `scripts/clean-dist.mjs` 逐檔刪除。同樣的原因，`scripts/deploy.mjs` 從系統暫存資料夾執行 wrangler，否則部署或登入完成後會以 127 結束。
