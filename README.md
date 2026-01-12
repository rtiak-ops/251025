# 🚀 BizFlow: Enterprise AI Task Management Platform

[![CI/CD Pipeline](https://github.com/rtiak-ops/251025/actions/workflows/ci.yml/badge.svg)](https://github.com/rtiak-ops/251025/actions/workflows/ci.yml)
[![Trivy Security Scan](https://img.shields.io/badge/Security-Trivy_Passed-brightgreen)](https://github.com/rtiak-ops/251025/security/code-scanning)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react)](https://reactjs.org/)
[![Terraform](https://img.shields.io/badge/Terraform-7B42BC?style=flat&logo=terraform)](https://www.terraform.io/)

<table align="center">
  <tr>
    <td align="center" width="50%">
      <img src="docs/images/todo-auth.png" alt="認証ページ" style="max-width:100%;"><br>
      <sub>認証画面</sub>
    </td>
    <td align="center" width="50%">
      <img src="docs/images/todo-todos.png" alt="ダッシュボード" style="max-width:100%;"><br>
      <sub>ダッシュボード</sub>
    </td>
  </tr>
</table>

## 🌟 プロジェクト概要

**BizFlow** は、単なるタスク管理を超えた、**「実務の複雑さに耐えうるプロフェッショナルなタスクプラットフォーム」**です。
プロジェクト管理、ビジネスワークフロー、そして最新のLLM（大規模言語モデル）によるタスク分解機能を統合しました。

ビジネス現場で求められる「優先順位の可視化」「プロジェクト横断の進捗管理」「AIによる業務の細分化」を、グラスモーフィズムを採用したプレミアムなUXで実現しています。

## 📋 目次
- [✨ 主要なビジネス機能](#-主要なビジネス機能)
- [🏗️ システムアーキテクチャ](#️-システムアーキテクチャ)
- [📊 データベース設計 (ER図)](#-データベース設計-er図)
- [🎬 主要なシーケンス (Core Workflows)](#-主要なシーケンス-core-workflows)
- [💡 解決した技術的課題](#-解決した技術的課題)
- [🛠️ 技術スタック & 選定理由](#️-技術スタック--選定理由)
- [🧪 テスト & 品質管理](#-テスト--品質管理)
- [🚀 セットアップガイド](#-セットアップガイド)
    - [1. 🏠 ローカル開発環境 (Docker)](#1--ローカル開発環境-docker)
    - [2. ☁️ クラウド展開 (AWS/Terraform)](#2--クラウド展開-awsterraform)
- [📈 今後の展望 (Product Roadmap)](#-今後の展望-product-roadmap)

---

## ✨ 主要なビジネス機能

### 1. 📊 ダッシュボード
全体のタスク進捗、プロジェクトごとの達成率、緊急タスクの警告を一目で把握可能。
- **達成率の可視化**: プロジェクトごとの進捗を動的なプログレスバーで表示。
- **緊急アラート**: 優先度が「至急(URGENT)」のタスクが残っている場合に自動で通知。

### 2. 📁 プロジェクト・階層管理
タスクをプロジェクト単位で整理し、業務の境界を明確にします。
- **プロジェクト横断表示**: すべてのタスクを俯瞰するビューと、プロジェクトに特化したビューを即座に切り替え。
- **動的なフォルダ機能**: サイドバーから直感的にプロジェクトを作成・管理。

### 3. 🚦 ビジネス・ワークフロー
現場の運用に即したタスク情報の管理を実現。
- **4段階の優先度**: `LOW`, `MEDIUM`, `HIGH`, `URGENT` によるフィルタリング。
- **ライフサイクル管理**: `未着手` → `進行中` → `レビュー` → `完了` のステータス遷移。
- **期限管理**: 期限付きタスクを視覚的に強調。

### 4. 🧠 AIタスク分解 (GenAI Integration)
「大きな課題」を「実行可能なステップ」に。
- **AI分解**: 入力された抽象的なタスクを、Google Gemini APIを活用して具体化・細分化。
- **シームレスな登録**: 分解されたサブタスクを、現在のプロジェクト配下に一括で自動登録。

### 5. 🔍 高速な全文検索
必要な情報を瞬時に特定。
- **リアルタイム検索**: タイトルや説明文から、プロジェクト横断でタスクを高速に検索。
- **動的フィルタリング**: 検索結果をさらに優先度やステータスで絞り込み可能。

### 6. 👥 チームコラボレーション
プロジェクトを共有し、協力してタスクを遂行。
- **プロジェクト招待**: メールアドレスを使用して、他ユーザーをプロジェクトに招待。
- **詳細な権限管理 (Editor/Viewer)**: 招待されたユーザーに対して、編集権限または閲覧のみの権限を付与可能。

### 🛡️ 高度なエンジニアリング機能 (Advanced Engineering)
- **🧩 Role-Based Access Control (RBAC)**: システム全体の管理者（Admin）と一般ユーザー（User）を分離。Admin専用の分析・監視ダッシュボードを搭載。
- **📜 監査ログ (Audit Log)**: データの作成・更新・削除の全履歴を「誰が・いつ・何をしたか」という形で記録し、可視化。
- **📈 パフォーマンス監視 (Observability)**: 
    - **Slow Query Detection**: SQLAlchemyのイベントリスナーによる100ms超のクエリ自動検知。
    - **Health Dashboard**: DBレイテンシやシステム統計（ユーザー数、タスク数等）のリアルタイム表示。

---

## 🏗️ システムアーキテクチャ

可用性とスケーラビリティを考慮し、AWSのマネージドサービスをフル活用したアーキテクチャを採用しています。

```mermaid
graph TD
    User([User's Browser]) <-->|HTTPS/CDN| CF[CloudFront]
    CF <-->|Static Files| S3[S3 Bucket]
    CF <-->|API Request| EC2[EC2 Instance / FastAPI]
    
    subgraph "AWS Cloud (Managed VPC)"
        EC2 <-->|RDS Connection| RDS[(RDS PostgreSQL)]
        EC2 -.->|JSON Logs| CW[CloudWatch]
        EC2 -.->|External API| AI[Gemini / OpenAI API]
    end

    subgraph "DevOps Ecosystem"
        GA[GitHub Actions] -->|Terraform Plan/Apply| AWS[AWS Infrastructure]
        GA -->|Build & Test| App[Application Code]
    end
```

### システム構成のポイント
- **フロントエンド層**: React + TypeScript で構築された SPA。Vite で最適化され、S3 + CloudFront を通じて世界中に低レイテンシで配信されます。
- **API層**: 高速な Python フレームワーク FastAPI を採用。EC2 上で Docker コンテナとして動作し、Nginx がリバースプロキシとしてリクエストを中継します。
- **データ層**: マネージドデータベースの Amazon RDS (PostgreSQL) を利用。プライベートサブネットに配置することでセキュリティを担保しています。
- **AI 連携**: Google Gemini API を活用し、自然言語によるタスクの自動分解機能を提供しています。

---

## 📊 データベース設計 (ER図)

ビジネス要件に対応した、リレーショナルなデータ構造を採用しています。

```mermaid
erDiagram
    USERS ||--o{ PROJECTS : "owns"
    USERS ||--o{ TODOS : "owns"
    PROJECTS ||--o{ TODOS : "contains"
    USERS ||--o{ PROJECT_COLLABORATORS : "participates"
    PROJECTS ||--o{ PROJECT_COLLABORATORS : "has"

    USERS {
        int id PK
        string email UK
        string hashed_password
        string role "admin, user"
        datetime created_at
    }
    PROJECTS {
        int id PK
        string name
        text description
        int owner_id FK
        datetime created_at
    }
    PROJECT_COLLABORATORS {
        int id PK
        int project_id FK
        int user_id FK
        string permission "viewer, editor"
    }
    TODOS {
        int id PK
        string title
        text description
        boolean completed
        string status "TODO, IN_PROGRESS, REVIEW, DONE"
        string priority "LOW, MEDIUM, HIGH, URGENT"
        datetime due_date
        int project_id FK
        int owner_id FK
        int order
    }
```

### 主要テーブルの説明
- **users**: システムの利用者情報を格納。`hashed_password` による安全な管理に加え、`role` による権限管理（管理者/一般）をサポートします。
- **projects**: 関連するタスクをグループ化するコンテナ。
- **project_collaborators**: プロジェクトの共有情報を管理。特定のプロジェクトに対して複数のユーザーを招待し、権限を割り当てます。
- **todos**: 最小単位のタスク。`status`, `priority`, `due_date` を保持し、詳細な管理が可能です。

---

## 🔥 独自のエンジニアリング・ポイント

### 1. ⚡ 楽観的UI更新 (Optimistic UI)
**TanStack Query** を活用し、並び替えやステータス更新を「待ち時間ゼロ」で反映。APIのレスポンスを待たずにUIを先行更新することで、デスクトップアプリのような操作感を提供。

### 2. 🛡️ セキュリティ・バイ・デザイン
- **認証**: JWT + HttpOnly Cookie (推奨) / Authorization Header によるセキュアな認証。
- **スキャン**: **Trivy** によるコンテナ/依存関係の脆弱性スキャンをGitHub Actionsで常時実施。
- **インフラ**: TerraformによるVPC/セキュリティグループの厳密な定義。

### 3. 🎨 プレミアムUX
- **グラスモーフィズム**: 半透明のぼかし効果を多用した最新のUIデザイン。
- **ダークモード同期**: OSの設定やユーザーの好みに合わせたスムーズなテーマ切り替え。

---

## 🛠️ 技術スタック & 選定理由

| カテゴリ | 技術 | 選定理由・トレードオフ |
|---|---|---|
| **Frontend** | React 19, TypeScript | 最新のAPI活用と型安全性の両立。Next.jsではなくSPA（Vite）を選んだのは、低コストなS3配信と、純粋なクライアントサイドのステート管理能力を誇示するため。 |
| **Backend** | Python 3.13, FastAPI | 非同期処理（AsyncIO）による高パフォーマンスなI/O。型ヒントによる堅牢な開発とAPIドキュメント自動生成によるDX向上。 |
| **Logic** | TanStack Query | 楽観的UI更新（Optimistic Update）の実装による圧倒的なUX。自前でのキャッシュ管理を避け、ライブラリに任せることでコードの抽象化を促進。 |
| **Database** | PostgreSQL 17 | 複雑なリレーション、JSON型による将来的なAIスレッドの保存を視野に入れ、堅牢なRDBMSを選択。 |
| **Infra** | AWS, Terraform | インフラのコード化（IaC）。手動設定を排除し、再現性とスケーラビリティを担保。 |
| **AI** | Gemini Pro / Flash | テキスト生成速度とコストのバランス。Gemini 1.5 Flashを使用することで、タスク分解の高速な応答を実現。 |

---

## 🧪 テスト & 品質管理

「動作すること」だけでなく「壊れないこと」を重視したテスト戦略を採用しています。

- **Backend**: `pytest` による単体・統合テスト。異常系（権限のないアクセス、レートリミット超過、DB接続断）を重点的にカバー。
- **Frontend**: `Vitest` + `React Testing Library` によるコンポーネントテスト。ローディング状態、エラー表示、フォームバリデーションを検証。
- **CI/CD**:
    - **カバレッジ目標**: 80%以上を維持。Codecovによる可視化。
    - **セキュリティ**: `Trivy` スキャンを全プルリクエストで実行し、高リスクな脆弱性を抱えたままのデプロイを阻止。
    - **自動化**: インフラからアプリまで、`main`へのマージのみで全て構築される完全なパイプライン。

---

---

## 🚀 セットアップガイド

### 1. 🏠 ローカル開発環境 (Docker)
最も手軽に環境を構築できる方法です。

```bash
git clone https://github.com/rtiak-ops/251025.git
cd 251025
cp .env.example .env
# .envにGOOGLE_API_KEYなどを設定（任意）
docker compose up --build
```
- **App**: [http://localhost](http://localhost)
- **API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

### 2. ☁️ クラウド展開 (AWS/Terraform)
AWS上に本番環境を自動構築し、GitHub Actionsによる継続的デプロイ（CD）を有効化します。

#### ① AWS 認証の設定
AWS SSOを使用して、ローカル端末からAWSを操作可能にします。
```bash
aws sso login
```

#### ② インフラの構築 (Terraform)
`terraform` ディレクトリに移動し、インフラを作成します。
```bash
cd terraform
# 初期化
terraform init
# 構築の実行 (変数の入力が求められます)
terraform apply
```

#### ③ GitHub Secrets の設定
GitHubのリポジトリ設定（Settings > Secrets and variables > Actions）に以下の値を登録することで、自動デプロイが開始されます。

| Secret Key | 説明 |
|---|---|
| `AWS_ROLE_ARN` | Terraform実行後に出力された `github_actions_role_arn` |
| `APP_SECRET_KEY` | JWT認証用の秘密鍵（32文字以上のランダムな文字列） |
| `DB_PASSWORD` | RDSのマスターパスワード |
| `EC2_SSH_KEY` | EC2接続用の秘密鍵 (PEM形式) |
| `EC2_USER` | `ec2-user` か `ubuntu` (AMIに依存) |
| `EC2_HOST` | EC2のパブリックIP（動的取得に失敗する場合の予備） |
| `GOOGLE_API_KEY` | Gemini APIキー |

#### 💡 運用時の Tips (CloudFront の IP 同期)
このプロジェクトを個人の学習用などで **「毎日 EC2 と RDS を停止・起動」** して運用する場合、以下の点に注意してください。

- **現象**: EC2 を再起動すると、パブリック IP アドレスが変わることがあります。このとき、CloudFront の接続先（Origin）が古い IP のままになり、サイトが表示されなくなる場合があります。
- **解決策**: EC2 を起動した後、ローカルで以下のコマンドを 1 回実行してください。
  ```bash
  cd terraform
  terraform apply
  ```
- **何が起きるか**: Terraform が最新の EC2 の IP アドレスを自動的に検知し、CloudFront の設定を現在の正しい IP へと更新してくれます。EC2 本体の再作成などは発生しません。
- **もっと楽にするには**: 運用の頻度が高い場合は、EC2 に `Elastic IP`（固定 IP）を割り当てることで、この手動更新の手順を不要にできます（※AWS の追加料金がかかる場合があります）。

#### ④ デプロイ
`main` または `develop` ブランチにコードを `push` すると、自動的にフロントエンド（S3/CloudFront）とバックエンド（EC2/Docker）が更新されます。

---

## 📈 今後の展望 (Product Roadmap)

ビジネスツールとしての完成度をさらに高めるため、以下の実装を予定しています。

1.  **監査ログ (Audit Log)**: 「いつ、誰が、何を」変更したかを全件保存。エンタープライズ利用に必須な構成管理。
2.  **高度なチーム権限 (RBAC)**: プロジェクト単位ではなく、より細かいリソース単位でのアクセス制御。
3.  **パフォーマンスモニタリング**: CloudWatchと連携したカスタムメトリクスの収集とSLI/SLOの定義。

---

## 📖 詳細ドキュメント
- [🔐 認証フローの徹底解説](AUTH_FLOW.md)
- [📘 コードリーディング・ガイド](CODE_READING_GUIDE.md)

---
**Developed by [rtiak-ops]**  
*Enterprise Scale. AI Native. Professional Quality.*

