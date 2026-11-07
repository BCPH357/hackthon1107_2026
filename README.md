# What is Town Pass?

Town Pass is an open-source project developed by the Taipei City Government. With the growth of smart cities, the demand for digitalization in city management and citizen services continues to rise. As we enter a new digital era, our goal is to involve citizens in the process, combining third-party expertise and innovation to make digital life in Taipei more convenient.

Town Pass is not just an application; it is an open community project. Through open-source, every citizen can participate in the ideation, development, and optimization of the application. This not only enhances citizen engagement and satisfaction but also leverages collective intelligence to continuously improve the application, making it truly serve the people. Furthermore, we hope that various municipalities can widely adopt the open-source framework of Town Pass, integrate it with their existing municipal service systems, and quickly have their own applications to enhance digital governance.

Open source is a key driver of technological progress and social development. Through open-source, Town Pass will become an ever-evolving platform, attracting developers from all backgrounds to contribute. We welcome experts to submit code, report issues, provide suggestions, and even develop new features and creative ideas, working together to perfect Town Pass as we advance toward a smart city.

# Getting Started

We highly recommend to read through our [document](https://tpe-guideline.web.app/en/docs/) for more detail.

Here are some quick setup guide.

## Requirement

- [Flutter](https://docs.flutter.dev/get-started/install) or [FVM](https://fvm.app/documentation/getting-started/installation)
- [XCode](https://developer.apple.com/xcode/) (for iOS)
- [Android SDK](https://developer.android.com/studio/index.html) (for Android, with or without Android Studio)

## Build the Project

1. Get the packages project needed:

   ``` bash
   flutter pub get
   ```

2. Generate additional needed dart code for the project.

   ``` bash
   dart run build_runner build
   ```

3. You are all set now, Run the project from your IDE or the through the command line:

   ``` bash
   flutter run
   ```

## 城市嚮導離線版（選用）

台北通 App 的「一步一步來」預設開 Cloudflare Pages 的正式網址 https://townpass-life-events.pages.dev/ ，網頁改版只要部署，App 不用重新建置；城市嚮導的裝置端 AI 問答在正式網址也能用。

要在沒有網路的場合 demo 時，才把網頁與 3D 素材打包進 App，並在 Flutter build 時明確指定使用離線版。修改網頁後要重跑打包與建置：

```bash
cd microservice
npm ci
VITE_API_BASE=https://xxxx.trycloudflare.com npm run build:app   # 交棒同步的後端網址，見 microservice/README.md
cd ..
fvm flutter run --dart-define=LIFE_EVENTS_BUNDLED=true
```

沒有加 `LIFE_EVENTS_BUNDLED=true` 時，就算 App 裡有打包好的 `site.zip` 也不會使用。

城市嚮導使用 `flutter_edge_ai` 2.5.6 與 `flutter_edge_ai_litertlm` 1.19.2 在裝置端從本機資料選擇服務。可用模型是 LiteRT Community 發布的 Google Gemma 4 IT，兩個版本均為 Apache-2.0 授權。

| 版本 | 模型檔 | 來源 |
| --- | --- | --- |
| Gemma 4 E2B IT | `gemma-4-E2B-it.litertlm`，混合 2、4、8 位元量化 | [E2B 模型卡](https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm) |
| Gemma 4 E4B IT | `gemma-4-E4B-it.litertlm`，3.66 GB 量化檔 | [E4B 模型卡](https://huggingface.co/litert-community/gemma-4-E4B-it-litert-lm) |

模型檔另存於 App 私有空間。iPhone 實測以 USB 將檔案放進 App 資料容器的 `Library/Application Support/gemma-models/`。同時放兩個版本時，預設先試 E4B，可在 Flutter build 加上 `--dart-define=CITY_GUIDE_PREFER_E2B=true` 優先使用 E2B。沒有可用模型時，三站導覽仍可用本機服務資料操作。[城市嚮導規劃與驗收](docs/ai-city-guide.md)
