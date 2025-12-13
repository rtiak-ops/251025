# 🚀 Modern Production-Ready ToDo App

単なるCRUDアプリではなく、**「実務レベルの品質（運用・保守・セキュリティ）」**を志向して設計された、モダンなWebアプリケーションです。

フロントエンドに React/TypeScript、バックエンドに FastAPI (Async)、インフラに Docker を採用し、さらに**CI/CDパイプライン、自動テスト、セキュリティ対策（Rate Limiting）、構造化ロギング**を完備しています。

---

## ✨ 主な特徴 (High-Level Features)

### 1. 堅牢なバックエンド (FastAPI & Async)
- **非同期処理**: `async/await` を徹底し、高負荷に耐えうる設計。
- **アーキテクチャ**: Routers, CRUD, Schemas, Models に責務を分離したレイヤードアーキテクチャ。
- **型安全性**: Pydantic と Python Type Hints を活用し、開発時のバグを低減。

### 2. 本番を意識した運用・セキュリティ機能
- **🛡️ セキュリティ**: `slowapi` による **Rate Limiting（レート制限）** を実装し、DoS攻撃やブルートフォース攻撃を防止。
- **📊 可観測性 (Observability)**: `python-json-logger` による **JSON構造化ロギング**。DatadogやCloudWatchでの解析を前提とした設計。
- **🔒 認証**: JWT (JSON Web Token) によるステートレスな認証システム。

### 3. 品質の保証 (QA & CI/CD)
- **🧪 自動テスト**: `pytest` による単体テスト・結合テスト（正常系・異常系）を完備。
- **🤖 CI/CD**: GitHub Actions による自動テストパイプライン。プルリクエストごとに品質をチェック。
- **⚡ DBテスト戦略**: テスト実行時はインメモリの `SQLite` を使用し、**高速かつクリーン**なテスト環境を実現。

### 4. モダンなフロントエンド
- React + TypeScript + Vite による高速な開発体験。
- Tailwind CSS による美しくレスポンシブなUIデザイン。

---

## 🛠️ 技術スタック

| Category | Technology | Description |
|Data | Tools | |
|---|---|---|
| **Frontend** | React, TypeScript | Vite採用で高速ビルド |
| **Styling** | Tailwind CSS | ユーティリティファーストなCSSフレームワーク |
| **Backend** | Python, FastAPI | 高速なASGI Webフレームワーク |
| **Database** | PostgreSQL | 本番用RDBMS |
| **ORM** | SQLAlchemy (Async) | 非同期対応のORM |
| **Testing** | pytest, httpx | インメモリSQLiteを用いた高速テスト |
| **Security** | slowapi, bcrypt | Rate Limiting, パスワードハッシュ化 |
| **Logging** | python-json-logger | JSON形式の構造化ログ |
| **Infra** | Docker Compose | フルスタック環境のコード化 |
| **CI/CD** | GitHub Actions | テスト自動化 |

---

## 🚀 クイックスタート

Docker がインストールされていれば、コマンド1つで環境が立ち上がります。

```bash
# リポジトリのクローン
git clone https://github.com/rtiak-ops/251025
cd 251025

# アプリケーション起動（ビルド含む）
docker compose up --build
```

アクセス先:
- **フロントエンド**: [http://localhost:5173](http://localhost:5173)
- **API ドキュメント (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🧪 テストの実行方法

品質を担保するため、開発時は必ずテストを実行します。

```bash
# バックエンドコンテナ内で pytest を実行
docker compose exec backend pytest -v
```

成功すると、以下のようにテスト結果が表示されます。

```text
tests/test_auth.py::test_register_user PASSED
tests/test_auth.py::test_register_duplicate_email PASSED
tests/test_auth.py::test_login_success PASSED
tests/test_auth.py::test_login_failure PASSED
```

---

## 📂 ディレクトリ構成

```text
.
├── .github/workflows/   # CI/CD設定 (GitHub Actions)
├── backend/
│   ├── app/
│   │   ├── routers/     # APIエンドポイント定義
│   │   ├── models.py    # DBモデル
│   │   ├── schemas.py   # Pydanticスキーマ
│   │   ├── crud.py      # DB操作ロジック
│   │   ├── limiter.py   # Rate Limiter設定
│   │   └── main.py      # アプリ起動・設定
│   ├── tests/           # 自動テスト (pytest)
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/            # React/Vite アプリケーション
├── db/                  # DBデータ永続化ディレクトリ
└── docker-compose.yml   # 構成ファイル
```

---

## 👨‍💻 開発者向けメモ

### ログの確認方法
構造化ログ（JSON）が出力されているか確認するには、ログコマンドを使用します。

```bash
docker compose logs -f backend
```

出力例:
```json
{"asctime": "2025-12-13 17:00:00", "levelname": "INFO", "name": "app.main", "message": "アプリケーション起動"}
```

---

**Developed by rtiak-ops**
