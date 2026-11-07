FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

ENV PORT=5000
EXPOSE 5000

# 案件存在記憶體，只能有一個 worker（多個 worker 各有一份記憶體，資料會對不起來）；用多執行緒處理同時的請求
CMD ["sh", "-c", "exec gunicorn --workers 1 --threads 8 --bind 0.0.0.0:${PORT} app:app"]
