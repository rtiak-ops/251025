import time
import logging
import os
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request

logger = logging.getLogger(__name__)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """ブラウザセキュリティ用のヘッダーを追加するミドルウェア"""
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        if os.getenv("ENV") == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """リクエストの処理時間を計測・記録するミドルウェア"""
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        
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
