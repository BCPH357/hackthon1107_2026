---
paths:
  - "lib/**/*"
  - "android/**/*"
  - "ios/**/*"
  - "assets/**/*"
---

# TownPass App（Flutter）

- 自訂 Handler 要繼承 `TPWebMessageHandler`，並加進 `lib/util/web_message_handler/tp_web_message_listener.dart` 的 `_cachedMessageHandlers`，沒加不會生效；`name` 不可與內建 Handler 重複
- 服務入口在 `lib/page/city_service/model/my_service_model.dart`：`MyServiceItemId` 加 id、`MyServiceIdExt` 加 case，`destinationUrl` 填 ngrok 的 https 網址
- 新增原生權限時兩個平台都要改：Android 改 `android/app/src/main/AndroidManifest.xml`，iOS 在 `ios/Runner/Info.plist` 填用途說明
- 測試帳號資料在 `assets/mock_data/account.json`，改 `citizen`、`birthday` 可切換市民、長者情境
