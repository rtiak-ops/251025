# 🚀 AWS EC2 デプロイ完全ガイド (最新版)

このガイドでは、AWSの基本を学びながら、アプリを世界中に公開する手順を詳しく解説します。
Amazon Linux 2023 に対応した最新の手順です。

---

## 📋 準備するもの
- AWS アカウント
- クレジットカード（登録用）
- やる気！

---

## 🛠️ ステップ 1: AWS コンソールで「サーバー」を借りる

1. **EC2 ダッシュボードへ移動**
   - AWSコンソールで「EC2」を検索します。
2. **インスタンスを起動**
   - 「インスタンスを起動」をクリック。
3. **名前とタグ**
   - 名前: `my-todo-app`
4. **OS (AMI)**
   - **Amazon Linux 2023 AMI** を選択（無料枠対象）。
5. **インスタンスタイプ**
   - **t3.micro** などを選択。
6. **キーペア**
   - 新しく作成 または 既存のものを選択。`.pem` ファイルを大切に保管。
7. **ネットワーク設定**
   - SSH, HTTP, HTTPS のトラフィックを許可にチェック。
8. **起動**
   - 「インスタンスを起動」をクリック。

---

## 💻 ステップ 2: サーバーにログインする (SSH)

1. **パブリック IP を確認**
   - インスタンス詳細から IP をコピー。
2. **ターミナルで実行** (Windows PowerShell など)
   ```powershell
   ssh -i "C:\Users\rtiak\Desktop\AWS\EC2\app-key.pem" ec2-user@IPアドレス
   ```
   - `yes` と入力して接続。

---

## 📦 ステップ 3: 必要なソフトのインストール

Amazon Linux 2023 では、標準のパッケージマネージャで Docker Compose が利用可能です。

```bash
# 1. OSを最新にする
sudo dnf update -y

# 2. Docker と Git を入れる
sudo dnf install -y docker git
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# 3. Docker Compose プラグインを入れる
sudo dnf install -y docker-compose-plugin

# 4. バージョン確認 (数字が出ればOK)
docker compose version

# 5. 設定反映のため一度ログアウト
exit
```

**※ 必ず一度 `exit` してログインし直してください。**

---

## 🚀 ステップ 4: アプリのデプロイ

1. **コードの取得**
   ```bash
   git clone https://github.com/rtiak-ops/learning-app
   cd learning-app
   ```
2. **環境設定 (.env)**
   ```bash
   cp .env.example .env
   # 必要に応じて編集
   nano .env
   ```
3. **起動**
   ```bash
   docker compose up -d --build
   ```

✅ **確認**: ブラウザで `http://あなたのIP` を開き、動作を確認します。

---

## 🔄 運用コマンド

- **更新**: `git pull` -> `docker compose up -d --build`
- **ログ**: `docker compose logs -f`
- **停止**: `docker compose down`

---

## 💰 ステップ 5: 課金対策 (重要)

1. **インスタンスを停止 (Stop)**: 実行料金は止まりますが、ディスク(EBS)料金がわずか微量かかります。
2. **インスタンスを終了 (Terminate)**: サーバーを完全に削除します。**すべての課金が止まります。**

---

## ⏭️ 次のステップ
- **[RDS 移行ガイド](./RDS_MIGRATION_GUIDE.md)**: データベースを分離して安全に運用する。
- **[S3 + CloudFront ガイド](./S3_CLOUDFRONT_GUIDE.md)**: フロントエンドを爆速で配信する。
