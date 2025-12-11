# ToDo アプリ

タスクの追加 / 更新 / 削除 / 完了管理を備えたシンプルな ToDo アプリ。  
フロントエンド (React + TypeScript + Tailwind)、バックエンド (FastAPI)、DB (PostgreSQL) を Docker で一括起動できます。

---

## 特徴

- JWT を用いたメール + パスワード認証（登録・ログイン）
- タスクの作成・更新・削除・完了トグル
- ユーザーごとにタスクを分離
- Swagger UI (`/docs`) で API を確認可能
- docker compose でワンコマンド起動

---

## 技術スタック

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: FastAPI, SQLAlchemy (async), Alembic
- Auth: JWT (python-jose), bcrypt
- Database: PostgreSQL
- Infra/Tooling: Docker, docker-compose

---

## クイックスタート（Docker 利用）

前提: Docker / Docker Desktop がインストール済み。

```bash
git clone https://github.com/rtiak-ops/251025
cd 251025
docker compose up --build
```

- フロントエンド: http://localhost:5173
- バックエンド API & Swagger: http://localhost:8000/docs

### 停止

```bash
docker compose down
```

---

## サービス構成

- `frontend` (Vite dev server, ポート `5173`)
- `backend` (FastAPI + Uvicorn, ポート `8000`)
- `db` (PostgreSQL 15, 永続化ボリューム `postgres_data`)

---

## 環境変数・設定

docker compose 起動時はデフォルト値が自動で適用されます。

- `DATABASE_URL`: `postgresql+asyncpg://todo_user:todo_pass@db:5432/todo_db`
- DB ユーザー: `todo_user`
- DB パスワード: `todo_pass`
- DB 名: `todo_db`
- CORS 許可: `http://localhost:5173`, `http://localhost:3000`
- フロントの API ベース URL: `http://localhost:8000` (`src/api.ts`)

---

## API サマリ

- `POST /auth/register` : ユーザー登録
- `POST /auth/login` : ログイン（JWT 取得）
- `GET /todos` : 認証ユーザーのタスク一覧
- `POST /todos` : タスク作成
- `PATCH /todos/{id}` : タスク更新（タイトル / 説明 / 完了）
- `DELETE /todos/{id}` : タスク削除

詳細は `http://localhost:8000/docs` を参照してください。

---

## ディレクトリ構成

/
├─ frontend/ # React / TypeScript / Vite
├─ backend/ # FastAPI アプリケーション
├─ db/ # PostgreSQL データ永続化
└─ docker-compose.yml

---

## よくある操作

- コンテナ再ビルド: `docker compose up --build`
- ログ確認: `docker compose logs -f backend` / `frontend` / `db`
- ボリューム削除（データ初期化）: `docker compose down -v`

---

## 開発者

- rtiak-ops
