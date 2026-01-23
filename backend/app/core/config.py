import os
from dotenv import load_dotenv

load_dotenv()

# --- 基本設定 ---
ENV = os.getenv("ENV", "development")
DEBUG = os.getenv("DEBUG", "false").lower() == "true"
PROJECT_NAME = "Async FastAPI ToDo App"

# --- セキュリティ設定 ---
SECRET_KEY = os.getenv("SECRET_KEY", "CHANGE_ME")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# --- データベース設定 ---
DATABASE_URL = os.getenv("DATABASE_URL")

# --- CORS設定 ---
CORS_ORIGINS = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "").split(",") if origin.strip()]
if not CORS_ORIGINS:
    CORS_ORIGINS = [
        "http://localhost",
        "http://localhost:5173",
        "https://localhost",
        "http://127.0.0.1",
        "http://127.0.0.1:5173",
        "https://127.0.0.1",
    ]

# --- AI API Keys ---
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# バリデーション
if ENV == "production" and (SECRET_KEY == "CHANGE_ME" or len(SECRET_KEY) < 32):
    raise ValueError("本番環境では安全なSECRET_KEY（32文字以上）が必須です。")
