import time
import logging
import os
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request

logger = logging.getLogger(__name__)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    全てのレスポンスにセキュリティ強化のためのHTTPヘッダーを追加するミドルウェア
    """
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        # クリックジャッキング防止（iframe内での表示を禁止）
        response.headers["X-Frame-Options"] = "DENY"
        # MIMEタイプのミスマッチを利用した攻撃を防止
        response.headers["X-Content-Type-Options"] = "nosniff"
        # XSSフィルタリングの有効化
        response.headers["X-XSS-Protection"] = "1; mode=block"
        # 本番環境ではHTTPSへの強制（HSTS）を指示
        if os.getenv("ENV") == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    各APIリクエストの情報をログに記録し、処理時間を計測するミドルウェア
    """
    async def dispatch(self, request: Request, call_next):
        # 処理開始時間を記録
        start_time = time.time()
        
        # 実際のエンドポイント処理を実行
        response = await call_next(request)
        
        # 処理時間を計算（秒）
        process_time = time.time() - start_time
        
        # JSON形式のロガーに対して情報を追加
        logger.info(
            f"API Request: {request.method} {request.url.path}",
            extra={
                "method": request.method,
                "path": request.url.path,
                "process_time_ms": round(process_time * 1000, 2),
                "status_code": response.status_code
            }
        )
        return response
