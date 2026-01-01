# ⚙️ Modern AI-Powered ToDo - Backend

このディレクトリには、Modern AI-Powered ToDo App のコアロジックを担う API サーバーが含まれています。  
FastAPI を採用し、非同期処理と型安全性を重視した設計となっています。

---

## ✨ 主な特徴

- **高速な非同期 API**: `FastAPI` と `uvicorn` による高パフォーマンスなリクエスト処理。
- **AI タスク分解エンジン**: OpenAI API を利用した、インテリジェントなサブタスク生成機能。
- **堅牢なデータ永続化**: `PostgreSQL 17` と `SQLAlchemy 2.0 (Async)` による非同期 DB アクセス。
- **モダンな認証**: `JWT (JSON Web Token)` を使用した、セキュアなユーザー認証と認可。
- **自動マイグレーション**: `Alembic` による DB スキーマのバージョン管理。
- **セキュリティ**: `slowapi` によるレート制限、CORS、およびセキュリティヘッダーの適切な設定。

---

## 🛠️ 技術スタック

- **Core**: `Python 3.12`, `FastAPI`
- **ORM**: `SQLAlchemy 2.0` (Async mode)
- **DB Migration**: `Alembic`
- **Validation**: `Pydantic v2`
- **Security**: `Passlib` (argon2), `PyJWT`
- **AI**: `OpenAI SDK`
- **Logging**: `python-json-logger`
- **Testing**: `pytest`, `httpx`

---

## 🚀 開発ガイド

### 1. 環境構築

```bash
# 仮想環境の作成 (推奨)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 依存パッケージのインストール
pip install -r requirements.txt
```

### 2. 環境変数の設定

`.env` ファイルを作成し、必要な情報を設定してください。

```bash
DATABASE_URL=postgresql+asyncpg://user:password@localhost/dbname
OPENAI_API_KEY=sk-...
SECRET_KEY=your-super-secret-key
```

### 3. API サーバーの起動

```bash
uvicorn app.main:app --reload
```

- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

### 4. テストの実行

```bash
pytest
```

---

## 📂 ディレクトリ構成

- `app/main.py`: アプリケーションのエントリポイント
- `app/routers/`: API エンドポイントの定義 (Todos, Auth, etc.)
- `app/models/`: SQLAlchemy の DB モデル定義
- `app/schemas/`: Pydantic によるリクエスト/レスポンスのスキーマ定義
- `app/services/`: ビジネスロジック (AI連携、認証ロジック等)

---

**Engineered for Performance by rtiak-ops**
