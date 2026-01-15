# 🎯 次にやるべきこと（優先順位順）

このファイルは、アプリケーション改善後に実施すべきタスクをまとめたものです。

---

## 🔴 **即座に実行すべきこと**

### 1. SECRET_KEYの生成と設定

```bash
# 安全なSECRET_KEYを生成
openssl rand -hex 32

# 出力された文字列を.envファイルのSECRET_KEYに設定
# 例: SECRET_KEY=a1b2c3d4e5f6...（64文字）
```

### 2. 初回マイグレーションの作成

```bash
# コンテナを起動
docker compose up -d

# 現在のスキーマから初回マイグレーションを生成
docker compose exec backend alembic revision --autogenerate -m "Initial migration"

# マイグレーションを適用
docker compose exec backend alembic upgrade head

# 適用されたことを確認
docker compose exec backend alembic current
```

### 3. ヘルスチェックの確認

```bash
# バックエンドのヘルスチェック
curl http://localhost:8000/health

# 期待されるレスポンス:
# {"status":"healthy","database":"connected","timestamp":"..."}

# フロントエンドの確認
curl http://localhost/

# Dockerコンテナのヘルスステータス確認
docker compose ps
```

---

## 🟡 **1週間以内に実施すべきこと**

### 4. テストの実行と確認

```bash
# バックエンドテスト
docker compose exec backend pytest -v --cov=app

# フロントエンドテスト（フロントエンドディレクトリで）
cd frontend
npm run test

# カバレッジレポート生成
npm run test:coverage
```

### 5. セキュリティ脆弱性の確認

```bash
# フロントエンドの脆弱性チェック
cd frontend
npm audit

# 修正可能な脆弱性を自動修正
npm audit fix

# バックエンドの脆弱性チェック（Dockerコンテナ内で）
docker compose exec backend pip list --outdated
```

### 6. 環境変数の最終確認

`.env`ファイルを開いて以下を確認:

- [ ] `SECRET_KEY` が32文字以上のランダムな文字列
- [ ] `ENV` が適切に設定（development or production）
- [ ] `DATABASE_URL` が正しい
- [ ] `POSTGRES_PASSWORD` が強力なパスワード
- [ ] `OPENAI_API_KEY` が設定されている（AI機能を使う場合）

---

## 🟢 **1ヶ月以内に実施すべきこと**

### 7. 本番環境へのデプロイ準備

#### 7.1 環境変数の本番設定

```bash
# .env.productionファイルを作成
cp .env.example .env.production

# 以下を設定:
ENV=production
DEBUG=false
SECRET_KEY=<本番用の強力な鍵>
DATABASE_URL=<本番DBのURL>
CORS_ORIGINS=https://yourdomain.com
```

#### 7.2 SSL証明書の取得（Let's Encrypt）

```bash
# Certbotを使用してSSL証明書を取得
# （詳細はDEPLOY_PLAN.mdを参照）
```

### 8. 監視とロギングの設定

#### 8.1 ログ集約

- [ ] CloudWatch Logs または Datadog の設定
- [ ] エラーアラートの設定
- [ ] ログ保持期間の設定

#### 8.2 メトリクス監視

- [ ] Prometheus + Grafana のセットアップ
- [ ] CPU/メモリ使用率の監視
- [ ] レスポンスタイムの監視
- [ ] エラーレートの監視

### 9. バックアップ戦略の実装

```bash
# PostgreSQLの自動バックアップスクリプト
# crontabに追加:
# 0 2 * * * docker compose exec -T db pg_dump -U $POSTGRES_USER $POSTGRES_DB | gzip > /backups/db_$(date +\%Y\%m\%d).sql.gz
```

---

## 📊 **継続的に実施すべきこと**

### 10. 定期的なメンテナンス

#### 毎週
- [ ] GitHub Actionsのビルド状態を確認
- [ ] セキュリティアラートをチェック
- [ ] ログを確認してエラーがないか確認

#### 毎月
- [ ] 依存関係の更新
  ```bash
  # フロントエンド
  cd frontend
  npm outdated
  npm update
  
  # バックエンド
  docker compose exec backend pip list --outdated
  ```
- [ ] バックアップの復元テスト
- [ ] パフォーマンステストの実行

#### 四半期ごと
- [ ] セキュリティ監査の実施
- [ ] アクセスログの分析
- [ ] ユーザーフィードバックの収集と対応

---

## 🚀 **将来的な機能追加（Phase 4-6）**

### Phase 4: 監視・ロギング強化
- [ ] Sentryエラートラッキングの導入
- [ ] Google Analyticsの統合
- [ ] APM（Application Performance Monitoring）の導入

### Phase 5: 新機能
- [ ] タスク共有機能
- [ ] 通知機能（メール/プッシュ）
- [ ] タグ・カテゴリ機能
- [ ] 全文検索（Elasticsearch）
- [ ] データエクスポート機能
- [ ] 統計ダッシュボード

### Phase 6: インフラ改善
- [ ] Kubernetesへの移行
- [ ] CDNの導入（CloudFront）
- [ ] マルチリージョン対応
- [ ] 自動スケーリング設定

---

## 📚 **参考ドキュメント**

- `IMPROVEMENTS.md` - 実装した改善の詳細
- `README.md` - アプリケーションの使い方
- `DEPLOY_PLAN.md` - デプロイ手順
- `backend/alembic/README` - マイグレーションの使い方
- `.github/workflows/ci.yml` - CI/CD設定

---

## ✅ **チェックリスト**

実施したタスクにチェックを入れてください:

- [ ] SECRET_KEYを生成・設定
- [ ] 初回マイグレーションを作成・適用
- [ ] ヘルスチェックを確認
- [ ] バックエンドテストを実行
- [ ] フロントエンドテストを実行
- [ ] セキュリティ脆弱性をチェック
- [ ] 環境変数を最終確認
- [ ] 本番環境の準備
- [ ] 監視・ロギングを設定
- [ ] バックアップ戦略を実装

---

**最終更新日**: 2025年12月25日
