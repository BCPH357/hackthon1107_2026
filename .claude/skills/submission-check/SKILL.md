---
name: submission-check
description: 檢查黑客松繳交項目是否齊全（原始碼、LICENSE、README、資料來源、套件授權、Dockerfile、AI 揭露、地圖規則）。在準備繳交、整理 repo，或被問到「繳交前要檢查什麼」時使用。
---

# 繳交前檢查

逐項檢查 repo，每一項標成「已完成」「缺少」或「需要人工確認」，最後列出待辦清單。除非使用者要求，不要自行補寫內容。

1. 原始碼齊全：`microservice/`、`backend/`、修改過的 TownPass 都在 repo 裡，且已 push 到 origin
2. Repo 是公開的：`gh repo view --json visibility`；沒有 `gh` 就請使用者到 GitHub 確認
3. 授權：作品採 AGPL-3.0 並附主辦指定的授權聲明。聲明內容向使用者確認，不要自己編
4. `README`：照著做就能從零建置並執行 App、前端、後端
5. 資料來源清單：每個資料集的名稱與連結，模擬資料要標示出來
6. 第三方套件清單：列出 `microservice/package.json`、`backend/requirements.txt` 的套件，以及 `pubspec.yaml` 中相對 upstream 新增的套件，逐一註明授權；標出非開源或授權不明的
7. `backend/Dockerfile` 存在；電腦有 Docker 的話實際跑一次 `docker build`
8. 有 AI 功能時：README 揭露模型名稱、版本、量化格式、推論框架與來源；搜尋 `openai`、`anthropic`、`generativelanguage` 等字串，確認執行時沒有呼叫雲端 LLM API
9. 地圖：搜尋 `maps.googleapis`、`mapbox`、`google_maps_flutter`，確認沒有使用非開源地圖
