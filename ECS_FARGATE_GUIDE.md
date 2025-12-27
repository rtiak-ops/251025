# 🚢 AWS ECS Fargate 移行ガイド (サーバーレス・コンテナ運用の自動化)

EC2 でのコンテナ運用から、サーバーの管理が不要な **AWS ECS (Elastic Container Service) Fargate** に移行します。
これにより、サーバーの OS アップデートや容量不足の心配から解放され、より安定した運用が可能になります。

---

## 🏗️ 全体像
1.  **ECR (Elastic Container Registry)**: 作成した Docker イメージを保存する場所。
2.  **ECS Cluster / Fargate**: Docker コンテナを実際に動かす実行環境（サーバーレス）。
3.  **Application Load Balancer (ALB)**: 外部からのリクエストをコンテナに割り振る。

---

## 🛠️ ステップ 1: ECR にイメージを登録

まず、あなたのアプリのイメージを AWS のプライベート倉庫（ECR）に保存します。

1.  **ECR リポジトリの作成**:
    *   名前: `todo-backend`
2.  **プッシュコマンドの実行**:
    *   AWS コンソールの「プッシュコマンドの表示」に従い、ローカルでコマンドを実行します。
    ```bash
    # ログイン
    aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin xxxxxxxx.dkr.ecr.ap-northeast-1.amazonaws.com
    
    # ビルド
    docker build -t todo-backend ./backend
    
    # タグ付け
    docker tag todo-backend:latest xxxxxxxx.dkr.ecr.ap-northeast-1.amazonaws.com/todo-backend:latest
    
    # プッシュ
    docker push xxxxxxxx.dkr.ecr.ap-northeast-1.amazonaws.com/todo-backend:latest
    ```

---

## 📋 ステップ 2: タスク定義 (Task Definition) の作成

「どんなコンテナを、どのくらいのスペックで動かすか」の設計図を作ります。

1.  **起動タイプ**: `AWS Fargate` を選択。
2.  **タスクサイズ**: CPU 0.25 vCPU, メモリ 0.5 GB (最小構成でOK)。
3.  **コンテナの設定**:
    *   名前: `backend`
    *   イメージ: ステップ1でプッシュした ECR の URI。
    *   ポートマッピング: `8000` (FastAPI) を指定。
    *   **環境変数**: `.env` に書いていた内容（`DATABASE_URL`, `SECRET_KEY` 等）をここに入力します。
        *   ※本番では **AWS Secrets Manager** を使うのが安全ですが、まずは直接入力で始めてもOKです。

---

## 🌐 ステップ 3: クラスターとサービスの作成

実際にコンテナを起動し、ロードバランサーで公開します。

1.  **ECS クラスターの作成**:
    *   名前: `todo-cluster`
    *   インフラストラクチャ: `AWS Fargate`を選択。
2.  **サービスの作成**:
    *   デプロイ設定: 上で作った「タスク定義」を選択。
    *   必要なタスク数: `1` (慣れたら `2` にすると、1台壊れても止まらない構成になります)。
3.  **ネットワーキング & ロードバランシング**:
    *   **ロードバランサーの種類**: `Application Load Balancer (ALB)`
    *   **リスナー**: ポート `80`。
    *   **ターゲットグループ**: 新規作成。ヘルスチェックパスは `/` または `/docs`。

---

## 🔒 ステップ 4: セキュリティグループの調整

1.  **ALB のセキュリティグループ**: `80` (HTTP) を全員から許可。
2.  **ECS のセキュリティグループ**: **ALB からのアクセスのみ**を許可。
3.  **RDS のセキュリティグループ**: **ECS のセキュリティグループからのアクセス**を追加で許可（重要！）。

---

## ⚙️ ステップ 5: フロントエンドの接続先変更

1.  **CloudFront/S3 側の調整**:
    *   フロントエンドのビルド時、`VITE_API_BASE_URL` を **ALB の DNS名**（例: `my-alb-123.ap-northeast-1.elb.amazonaws.com`）に変更して再ビルド・アップロードします。

---

## 🧹 ステップ 6: EC2 インスタンスの終了

すべての動作確認が取れたら、ついに EC2 を停止・終了できます。

1.  EC2 インスタンスを「終了 (Terminate)」します。
2.  これで「サーバーを管理しない」モダンなインフラへの移行が完了です！

---

## 💡 今後のステップ
*   **オートスケーリング**: アクセスが増えたら自動でコンテナを増やす設定ができます。
*   **CI/CD**: GitHub に push したら自動で ECR へのビルドと ECS へのデプロイが走るようにすると、開発がさらに快適になります。

---

✅ **おめでとうございます！これで AWS のベストプラクティスに近い構成になりました。**
