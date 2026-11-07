"""幫家人辦：案件進度同步後端。

長輩與子女兩支手機各自更新 checklist，透過這裡交換最新版本。
- 不使用資料庫：案件存在記憶體，服務重啟後會清空（demo 用；長輩手機可再上傳一次）。
- 伺服器不解讀案件內容：`data` 原樣存取，之後前端會改成只上傳加密後的 {iv, cipher}。
- 存取權杖在第一次 PUT 時綁定，伺服器只存 SHA-256 雜湊值，之後每次呼叫都要帶 `Authorization: Bearer <token>`。

API：
- PUT /api/cases/<id>          body: {"baseVersion": int, "data": any}；版本不符回 409 並附上目前版本
- GET /api/cases/<id>          回傳 {"version", "data", "updatedAt"}
- GET /api/cases/<id>/version  回傳 {"version"}，給前端輪詢用
- DELETE /api/cases/<id>       刪除案件（任一方清除自己的資料時呼叫），另一方之後讀取會拿到 404
- GET /api/health              確認服務與通道是否通
"""

from __future__ import annotations

import hashlib
import hmac
import os
import re
import threading
import time
from typing import Any

from flask import Flask, Response, jsonify, request

# 案件 id 由前端產生（UUID 或 base64url），限制字元與長度，避免奇怪的 key 塞進記憶體
CASE_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{8,64}$")
# 權杖由前端用亂數產生，太短的不收
MIN_TOKEN_LENGTH = 16
# 一個案件 1～3 KB，加密後再大一點；留足空間但擋掉異常大的請求
MAX_BODY_BYTES = 64 * 1024

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_BODY_BYTES

_lock = threading.Lock()
# case_id -> {"version": int, "token_hash": str, "data": Any, "updated_at": float}
_cases: dict[str, dict[str, Any]] = {}

# 前端與後端不同網域時才需要（例如正式部署時前端放在別的網址）；
# 開發時前端透過 Vite proxy 走同一個網域，不需要設定
_allowed_origins = {origin.strip() for origin in os.environ.get("ALLOWED_ORIGINS", "").split(",") if origin.strip()}


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _bearer_token() -> str | None:
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return None
    token = header[len("Bearer ") :].strip()
    return token if len(token) >= MIN_TOKEN_LENGTH else None


def _error(status: int, code: str, **extra: Any) -> tuple[Response, int]:
    return jsonify({"error": code, **extra}), status


def _authorize(case: dict[str, Any]) -> tuple[Response, int] | None:
    """權杖正確回傳 None，否則回傳錯誤回應"""
    token = _bearer_token()
    if token is None:
        return _error(401, "missing_token")
    if not hmac.compare_digest(_hash_token(token), case["token_hash"]):
        return _error(403, "invalid_token")
    return None


@app.after_request
def _add_headers(response: Response) -> Response:
    # 進度隨時會變，任何一層都不要快取
    response.headers["Cache-Control"] = "no-store"
    origin = request.headers.get("Origin")
    if origin and origin in _allowed_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Vary"] = "Origin"
        response.headers["Access-Control-Allow-Methods"] = "GET, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = (
            "Authorization, Content-Type, ngrok-skip-browser-warning"
        )
    return response


@app.get("/api/health")
def health() -> Response:
    return jsonify({"ok": True})


@app.put("/api/cases/<case_id>")
def put_case(case_id: str):
    if not CASE_ID_PATTERN.match(case_id):
        return _error(400, "invalid_case_id")

    # Flask 2.x 的 get_json(silent=True) 不一定會擋下超過 MAX_CONTENT_LENGTH 的請求，自己檢查
    if request.content_length is not None and request.content_length > MAX_BODY_BYTES:
        return _error(413, "body_too_large")
    if len(request.get_data(cache=True)) > MAX_BODY_BYTES:
        return _error(413, "body_too_large")

    body = request.get_json(silent=True)
    if not isinstance(body, dict) or "data" not in body:
        return _error(400, "invalid_body")
    base_version = body.get("baseVersion")
    # bool 是 int 的子類別，要排除
    if not isinstance(base_version, int) or isinstance(base_version, bool) or base_version < 0:
        return _error(400, "invalid_base_version")

    token = _bearer_token()
    if token is None:
        return _error(401, "missing_token")

    with _lock:
        case = _cases.get(case_id)

        if case is None:
            # 第一次上傳：建立案件並綁定權杖
            if base_version != 0:
                return _error(409, "version_conflict", version=0)
            _cases[case_id] = {
                "version": 1,
                "token_hash": _hash_token(token),
                "data": body["data"],
                "updated_at": time.time(),
            }
            return jsonify({"version": 1}), 201

        denied = _authorize(case)
        if denied is not None:
            return denied
        if base_version != case["version"]:
            return _error(409, "version_conflict", version=case["version"])

        case["version"] += 1
        case["data"] = body["data"]
        case["updated_at"] = time.time()
        return jsonify({"version": case["version"]})


@app.get("/api/cases/<case_id>")
def get_case(case_id: str):
    if not CASE_ID_PATTERN.match(case_id):
        return _error(400, "invalid_case_id")
    with _lock:
        case = _cases.get(case_id)
        if case is None:
            return _error(404, "not_found")
        denied = _authorize(case)
        if denied is not None:
            return denied
        return jsonify(
            {
                "version": case["version"],
                "data": case["data"],
                "updatedAt": int(case["updated_at"] * 1000),
            }
        )


@app.get("/api/cases/<case_id>/version")
def get_case_version(case_id: str):
    if not CASE_ID_PATTERN.match(case_id):
        return _error(400, "invalid_case_id")
    with _lock:
        case = _cases.get(case_id)
        if case is None:
            return _error(404, "not_found")
        denied = _authorize(case)
        if denied is not None:
            return denied
        return jsonify({"version": case["version"]})


@app.delete("/api/cases/<case_id>")
def delete_case(case_id: str):
    # 長輩或子女清除自己手機上的資料時，連同伺服器上的案件一起刪掉；要帶同一把權杖
    if not CASE_ID_PATTERN.match(case_id):
        return _error(400, "invalid_case_id")
    with _lock:
        case = _cases.get(case_id)
        if case is None:
            return _error(404, "not_found")
        denied = _authorize(case)
        if denied is not None:
            return denied
        del _cases[case_id]
    return Response(status=204)


@app.errorhandler(413)
def _too_large(_error_obj):
    return _error(413, "body_too_large")


if __name__ == "__main__":
    # 本機開發用；Docker 裡改用 gunicorn（見 Dockerfile）
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "5000")), debug=False)
