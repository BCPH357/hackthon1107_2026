# 城市通微服務黑客松

2026 臺北秋季程式設計節的參賽作品，fork 自 taipei-doit/TownPass。比賽 11/7 開始，第二天以實機操作上台發表，所以「能在手機上穩定 demo」優先於功能數量。

## 溝通

- 對話、文件、程式碼註解、commit 訊息都用繁體中文（台灣用語）；變數、函式、檔名用英文

## 指令

- Flutter 一律用 `fvm flutter`、`fvm dart`：電腦上全域的 `flutter` 可能是舊版，專案需要 `.fvmrc` 指定的 3.47.6
- 安裝套件：`fvm flutter pub get`
- 產生程式碼：`fvm dart run build_runner build`（新增 `assets/svg/` 圖示、修改 `lib/bean/` 的 JSON model 後都要重跑）
- 靜態檢查：`fvm flutter analyze`
- 確認能建置：`fvm flutter build apk --debug`

## 比賽規則

違反會影響評選或得獎後的整併：

- 地圖只用 Leaflet 或 MapLibre，圖資用 OpenStreetMap 或國土測繪中心；不用 Google Maps、Mapbox、`google_maps_flutter`
- App 執行時不呼叫雲端 LLM API；AI 功能要在手機端推論。開發階段使用雲端 AI 沒問題
- 新增任何套件（npm、pip、pub）前確認授權為 MIT、BSD、Apache-2.0 等開源免費授權
- 核心資料來自 data.taipei、data.gov.tw、TDX 等開放資料並註明出處；模擬資料只用在非核心部分，且要標示

## 團隊決策

- 作品主體是在城市通 WebView 裡開啟的微服務網頁：前端 Vue 3 + Vite + TypeScript 放 `microservice/`，後端 Flask 放 `backend/`
- 不使用資料庫：使用者身分從 App 的 `userinfo` 取得，個人設定存 localStorage
- 用 ngrok 對外提供服務（比賽規則允許）
- TownPass 本體只改作品需要的部分，方便得獎後整併回官方版本

## 陷阱

- 不要在根目錄建立 `web/`：Flutter 會把它當成 Flutter Web 的平台資料夾
- `test/widget_test.dart` 是 Flutter 範本留下的計數器測試，跟這個 App 無關，`flutter test` 必定失敗，不要用它判斷改動是否正確
- `lib/gen/` 與 `*.g.dart` 由 build_runner 產生且被 gitignore，不要手動修改
- 入門指引寫的 `--delete-conflicting-outputs` 在新版 build_runner 已移除，加了也會被忽略
- Windows 上 `fvm install` 出現 errno 1314（無法建立 symlink）時，Flutter 其實已經裝好，`fvm flutter` 照常可用；開啟 Windows「開發人員模式」後重跑可消除錯誤，否則 VS Code 要手動把 Flutter SDK 指到 `%USERPROFILE%\fvm\versions\3.47.6`
