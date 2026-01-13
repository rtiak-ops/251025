# 📖 Code Reading Guide: アプリ理解のためのガイド

このドキュメントは、このプロジェクトの構造を理解し、効率的にコードを読み進めるためのガイドです。
このアプリは **FastAPI (Backend) + React (Frontend) + AWS (Infra)** という、モダンで実戦的な構成になっています。

---

## 🗺️ リーディング・ロードマップ

### Step 1: データの構造を理解する (Data Models)
まずは、このアプリがどのようなデータを扱っているかを知ることから始めましょう。

- **`backend/app/models.py`**
  - DBテーブルの定義 (SQLAlchemy)。
  - `User`, `Todo` に加え、操作履歴を記録する `AuditLog` (監査ログ) の定義が含まれます。
- **`frontend/src/types.ts`**
  - フロントエンドで扱うデータの型定義 (TypeScript)。
  - DBモデルがフロントエンドでどう表現されるかを確認できます。

### Step 2: APIの契約を理解する (API & Schema)
次に、フロントエンドとバックエンドがどう会話しているかを確認します。

- **`backend/app/schemas.py`**
  - APIのリクエスト/レスポンスの型定義 (Pydantic)。
  - どのAPIにどんなデータを送ればいいか、何が返ってくるかが定義されています。
- **`backend/app/routers/`**
  - 各エンドポイントの実装。
  - AIタスク分解 (`ai.py`)、管理機能 (`admin.py`)、システム監視 (`monitor.py`) など機能ごとに分割されています。

### Step 3: ビジネスロジックを理解する (Business Logic)
データの処理、保存、変換のルールを確認します。

- **`backend/app/crud.py`**
  - DB操作の具体的なロジック。
  - 「タスクを追加する」等の基本操作に加え、`crud_audit.py` では監査ログの記録ロジックが定義されています。
- **`backend/app/main.py`**
  - アプリ全体の起動設定、CORS、エラーハンドリング、ミドルウェアの設定。

### Step 4: UIと状態管理を理解する (Frontend Logic)
ユーザーが触れる部分と、その背後の状態変化を確認します。

- **`frontend/src/api.ts`**
  - バックエンドAPIを呼び出すための関数群。
- **`frontend/src/App.tsx`**
  - メインの画面コンポーネント。
  - **TanStack Query** によるデータの取得とキャッシュ、**Beautiful DnD** による操作が分かります。
- **`frontend/src/components/`**
  - UIの各パーツ（Todoアイテム、AIボタンなど）の責務が分かれます。
  - **`AuditLogView.tsx`** (監査ログ) や **`MonitorView.tsx`** (システム状況) など、管理者向け機能もここに実装されています。

### Step 5: インフラと運用を理解する (Infra & DevOps)
アプリがどう動き、どう守られ、どうデプロイされるかを確認します。

- **`docker-compose.yml`**
  - 開発環境（DB, API, Frontend）がどう連携して起動するか。
- **`terraform/`**
  - AWS上に構築されるインフラ（VPC, EC2, RDS, S3, CloudFront）の定義。
- **`.github/workflows/ci.yml`**
  - 自動テスト、ビルド、デプロイのパイプライン。

### Step 6: 品質担保の仕組み (Testing & Quality)
コードが意図通りに動き続け、安全であることを保証する仕組みを確認します。

- **`backend/tests/`**
  - pytestによるテストコード。正常系だけでなく、認証エラーやバリデーションエラーなどの異常系をどうテストしているか分かります。
- **`frontend/src/test/`**
  - React Testing Libraryを用いたUIテスト。ユーザー操作に対するUIの反応が定義されています。
- **`.github/workflows/ci.yml`**
  - `Trivy` による脆弱性スキャンの設定など、セキュリティ向上のための工夫が見られます。

---

## 💡 読み進める際のアドバイス

1. **「一筆書き」で追う**: 「タスクを追加する」という操作が、フロントエンドのクリックから始まり、APIを経由して、DBに保存されるまでのコードを一つの線で追いかけると理解が深まります。
2. **AIロジックに注目**: `Magic Breakdown` 機能を検索して、どのようにLLMが統合されているかを見るのが、このアプリの最も面白い部分です。
3. **不明点は Antigravity (AI) に聞く**: 特定のコード行の意味や、「なぜこの設計なのか？」という背景はいつでも質問してください。

---
Developed by rtiak-ops
