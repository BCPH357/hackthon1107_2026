離線網頁由 `cd microservice && npm run build:app` 產生為 `site.zip`。App 預設開 Cloudflare Pages 的正式網址，建置時加上 `--dart-define=LIFE_EVENTS_BUNDLED=true` 才會改用這個離線版。
