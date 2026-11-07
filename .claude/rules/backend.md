---
paths:
  - "backend/**/*"
---

# 後端（Flask）

- 不使用資料庫：開放資料抓回來放在記憶體快取，服務重啟後重抓即可
- TDX 等 API 金鑰從環境變數讀取，不寫進程式碼、不 commit；需要的變數名稱列在 `backend/.env.example`
- 前端與後端不同網域時要開 CORS，並允許 `ngrok-skip-browser-warning` header
- 埠號從環境變數 `PORT` 讀取
- 新增 pip 套件時同步更新 `backend/requirements.txt`，並確認授權為開源免費
- 要附 `backend/Dockerfile`，讓資訊局拿到 repo 後能直接執行（比賽規則：可移轉、可維運、可上架）
