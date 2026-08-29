# 🐘 AWS RDS 移行ガイド (最新版)

データベースをコンテナから切り離し、AWS のマネージドサービスである **RDS (Relational Database Service)** に移行します。
これにより、バックアップの自動化、データの安全性、パフォーマンスが向上します。

---

## 🏗️ 構成の変更
- **今まで**: EC2 内の Docker コンテナで DB が動いている (EC2 が止まるとデータが心配)。
- **これから**: DB 専用のサーバー (RDS) にデータを預ける (安全・安心)。

---

## 🛠️ ステップ 1: AWS RDS インスタンスの作成

1.  **RDS ダッシュボードへ移動**
    *   AWSコンソールで「RDS」を検索します。
2.  **データベースの作成**
    *   「標準作成」を選択。
    *   **エンジン**: PostgreSQL (バージョンは 16 または 17 推奨)。
    *   **テンプレート**: **無料利用枠** を必ず選択。
3.  **設定**
    *   DBインスタンス識別子: `my-app-db`
    *   マスターユーザー名: `postgresMaster`
    *   マスターパスワード: **強力なものを設定し、必ずメモしてください。**
4.  **接続**
    *   **VPC**: EC2 と同じものを選択。
    *   **パブリックアクセス**: **なし** (EC2 からのみアクセスさせる)。
    *   **セキュリティグループ**: 「新規作成」で `rds-sg` を作成。
5.  **追加の設定**
    *   最初のデータベース名: `todo_db` (ここに入れた名前が初期DBになります)。
6.  **作成**
    *   作成には 5〜10 分かかります。

---

## 🔒 ステップ 2: セキュリティグループの設定 (通信許可)

RDS が「EC2 からのアクセス」を受け入れるように設定します。

1.  RDS の詳細画面 → 「接続とセキュリティ」 → 「VPC セキュリティグループ」をクリック。
2.  インバウンドルールを編集。
3.  **タイプ**: `PostgreSQL` (5432 番ポート)。
4.  **ソース**: EC2 が使用しているセキュリティグループ ID (例: `sg-xxxxxx`) を選択。
5.  保存。

---

## 🚚 ステップ 3: データの移行 (Dump & Restore)

EC2 上で、コンテナのデータを RDS へコピーします。

1.  **RDS エンドポイントの取得**
    *   RDS の詳細画面から「エンドポイント」(例: `xxx.ap-northeast-1.rds.amazonaws.com`) をコピー。
2.  **バックアップ作成 (Dump)**
    ```bash
    # プロジェクトディレクトリに移動してから実行
    cd ~/learning-app
    docker compose exec -it db pg_dump -U postgresMaster todo_db > backup.sql
    ```
3.  **RDS へ復元 (Restore)**
    ```bash
    # psql コマンドが入っていない場合は sudo dnf install -y postgresql16 でインストール
    psql -h <RDSエンドポイント> -U postgresMaster -d todo_db -f backup.sql
    ```
    - パスワードを聞かれるので、ステップ 1 で決めたものを入力。

---

## ⚙️ ステップ 4: アプリの設定変更 (.env)

1.  **.env を編集**
    ```bash
    nano .env
    ```
2.  **DATABASE_URL を更新**
    ```text
    DATABASE_URL=postgresql+asyncpg://postgresMaster:パスワード@RDSエンドポイント:5432/todo_db
    ```
3.  **アプリ再起動**
    ```bash
    docker compose up -d backend
    ```

---

## 🧹 ステップ 5: 不要なコンテナの停止

RDS への移行が確認できたら、EC2 内の DB コンテナを消します。

1.  `docker-compose.yml` から `db` サービスと `volumes` の定義を削除。
2.  `docker compose up -d --remove-orphans` を実行。

---

✅ **お疲れ様でした！これでプロトタイプから本番レベルの構成へ進化しました！**
