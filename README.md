# 🚀 Modern AI-Powered ToDo App

**「AIアシスタント搭載 × 実務レベルのエンジニアリング」**

最新のLLM（大規模言語モデル）機能を統合しつつ、運用・保守・セキュリティといったプロフェッショナルな品質基準を満たすように設計された、次世代のWebアプリケーションです。

単なるタスク管理ではなく、**AIが「タスク分解」をサポート**することで、ユーザーの生産性を劇的に向上させます。

---

## ✨ AI機能: Magic Breakdown (New!)

### 🧠 AIタスク分解
「旅行の計画」「プレゼンの準備」といった漠然としたタスクを入力し、**「✨AI分解」ボタン**を押すだけで、AIが実行可能な具体的なサブタスクを生成・追加します。

- **安心のデフォルト設計**: OpenAI APIキーが設定されていない場合は、**自動的にモックモード（無料）**で動作します。課金の心配なく、AI機能のUX（ユーザー体験）を試すことができます。
- **実戦モード**: APIキーを設定すれば、GPT-3.5/4 がリアルタイムで思考し、高精度な提案を行います。

---

## 🛡️ エンジニアリング品質 (Production Ready)

### 1. 堅牢なバックエンド & セキュリティ
- **Rate Limiting**: `slowapi` により、APIへの過剰なアクセス（DoS/ブルートフォース）をIP単位で自動遮断。
- **可観測性 (Observability)**: `python-json-logger` による構造化ログ（JSON）で、Datadog/CloudWatch等での解析に対応。
- **非同期設計**: FastAPI (`async/await`) を全面採用し、高負荷に強いアーキテクチャ。

### 2. 品質保証 (QA & CI/CD)
- **自動テスト**: `pytest` + `sqlite(:memory:)` による高速かつクリーンなテスト環境。
- **CI/CD**: GitHub Actions により、プッシュごとにテストと品質チェックを自動実行。

### 3. モダンなフロントエンド
- **React + TypeScript + Vite**: 型安全かつ高速な開発体験。
- **UI/UX**: Tailwind CSS によるレスポンシブデザインと、AI思考中のローディング演出。

---

## 🛠️ 技術スタック

| Category | Technology | Usage |
|---|---|---|
| **AI / LLM** | OpenAI API | タスク分解エンジン (gpt-3.5-turbo) |
| **Frontend** | React, TypeScript | Vite採用で高速ビルド |
| **Styling** | Tailwind CSS | ユーティリティファーストなCSS |
| **Backend** | Python, FastAPI | 非同期ASGIフレームワーク |
| **Database** | PostgreSQL | 本番用データ永続化 |
| **ORM** | SQLAlchemy (Async) | 非同期DBアクセス |
| **Testing** | pytest, httpx | インメモリSQLiteを用いた高速テスト |
| **Security** | slowapi | レート制限 (Rate Limiting) |
| **Logging** | python-json-logger | JSON形式の構造化ログ |
| **Infra** | Docker Compose | フルスタック環境のコード化 |
| **CI/CD** | GitHub Actions | テスト自動化パイプライン |

---

## 🚀 クイックスタート

Docker があれば、コマンド1つですぐに立ち上がります。

```bash
# クローン
git clone https://github.com/rtiak-ops/251025
cd 251025

# 起動（ビルド含む）
docker compose up --build
```

- **アプリ**: [http://localhost:5173](http://localhost:5173)
- **API仕様書**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## ⚙️ 設定 (Configuration)

`docker-compose.yml` または `.env` ファイルで設定を変更できます。

| 変数名 | 説明 | デフォルト値 |
|---|---|---|
| `OPENAI_API_KEY` | 本物のAIを使用する場合に設定。("sk-...") | 設定なし (モックモードで動作) |
| `DATABASE_URL` | DB接続文字列 | postgresql+asyncpg://... |

**本物のAIを使う場合の設定例:**
```yaml
# docker-compose.yml
services:
  backend:
    environment:
      OPENAI_API_KEY: "sk-your-openai-api-key-here"
```

---

## 🧪 開発・テスト

```bash
# バックエンドのテスト実行
docker compose exec backend pytest -v
```

---

## 📂 ディレクトリ構成

```text
.
├── .github/workflows/   # CI/CD (GitHub Actions)
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   │   ├── ai.py    # AI連携ロジック
│   │   │   ├── auth.py  # 認証・レート制限
│   │   │   └── ...
│   │   ├── limiter.py   # セキュリティ設定
│   │   └── main.py
│   ├── tests/           # 自動テスト
│   └── ...
├── frontend/            # Reactアプリ
└── docker-compose.yml
```

---

**Developed by rtiak-ops**
