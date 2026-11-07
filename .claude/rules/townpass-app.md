---
paths:
  - "lib/**/*"
  - "android/**/*"
  - "ios/**/*"
  - "assets/**/*"
---

# TownPass App（Flutter）

- 自訂 Handler 要繼承 `TPWebMessageHandler`，並加進 `lib/util/web_message_handler/tp_web_message_listener.dart` 的 `_cachedMessageHandlers`，沒加不會生效；`name` 不可與內建 Handler 重複
- 服務入口在 `lib/page/city_service/model/my_service_model.dart`：`MyServiceItemId` 加 id、`MyServiceIdExt` 加 case，`destinationUrl` 要填 https 網址；「一步一步來」預設是 Cloudflare Pages 的固定網址，測試未部署的版本時用 `--dart-define=LIFE_EVENTS_URL=` 蓋過
- 新增原生權限時兩個平台都要改：Android 改 `android/app/src/main/AndroidManifest.xml`，iOS 在 `ios/Runner/Info.plist` 填用途說明
- 測試帳號資料在 `assets/mock_data/account.json`，改 `citizen`、`birthday` 可切換市民、長者情境
- `TPWebView` 的 `onPermissionRequest` 只放行「一步一步來」網址的相機與方向感測器（白名單在 `lib/util/tp_web_view.dart`）；新網域要用 AR 時要加進白名單，否則網頁拿不到相機
