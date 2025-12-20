# 🚀 AWS EC2 デプロイ・決定版ガイド (HTTP版)

このガイドは、**Amazon Linux 2023** を使用して、Webアプリを「確実」「最速」で公開するための手順書です。

---

## � 事前準備チェックリスト
作業を始める前に、以下が手元にあるか確認してください。
- [ ] AWS アカウント
- [ ] 作成済みのキーペア（`.pem` ファイル）
- [ ] サーバーのパブリック IP アドレス

---

## �🛠️ ステップ 1: AWS コンソールの設定 (重要)
サーバーを借りる際、以下の設定を必ず行ってください。
1. **セキュリティグループの設定**:
   - `SSH` (22番ポート): 自分のIPのみ許可
   - `HTTP` (80番ポート): **全員 (0.0.0.0/0) に開放** 👈 これを忘れるとサイトが見れません！

---

## 🛠️ ステップ 2: サーバーのセットアップ
ターミナル（PowerShellやMacのターミナル）からログインし、以下のコマンドを順番にコピー＆ペーストしてください。

### 1. 基本ツールのインストール
```bash
# OSを最新の状態にする
sudo dnf update -y

# Docker（コンテナを動かす道具）と Git（コードを取得する道具）をインストール
sudo dnf install -y docker git

# Dockerを起動し、次回から自動で起動するように設定
sudo systemctl start docker
sudo systemctl enable docker

# 現在のユーザー(ec2-user)で sudo なしで Docker を使えるようにする
sudo usermod -aG docker ec2-user
```

### 2. Docker Compose (最新版) の導入
標準の古いコマンドではなく、最新のプラグイン版を入れます。
```bash
# プラグイン用フォルダを作成
mkdir -p ~/.docker/cli-plugins

# Buildx (高速ビルドツール) のダウンロード
curl -SL https://github.com/docker/buildx/releases/download/v0.19.3/buildx-v0.19.3.linux-amd64 -o ~/.docker/cli-plugins/docker-buildx

# Docker Compose のダウンロード
curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 -o ~/.docker/cli-plugins/docker-compose

# 実行権限を与える
chmod +x ~/.docker/cli-plugins/docker-buildx ~/.docker/cli-plugins/docker-compose
```

### 3. 設定の反映 (一度ログアウト)
```bash
exit
```
**※ 設定を反映させるため、必ず一度ログアウトしてから再度 SSH でログインしてください。**

---

## � ステップ 3: アプリの起動
再ログイン後、プロジェクトをダウンロードして起動します。

```bash
# 1. ソースコードを GitHub から取得
git clone https://github.com/rtiak-ops/251025
cd 251025

# 2. アプリをビルドしてバックグラウンドで起動
docker compose up -d --build
```

✅ **確認**: ブラウザで `http://あなたのIPアドレス` を開き、アプリが表示されれば成功です！

---

## 🔄 アプリを更新する方法
PCでコードを変更して GitHub にプッシュした後は、サーバーで以下を実行するだけです。

```bash
cd ~/251025
# 最新のコードを取得
git pull origin main
# 更新分を反映して再起動
docker compose up -d --build
```

---

## 🧹 ステップ 4: 後片付け (課金停止)
使い終わったら、無駄な料金がかからないように以下の手順で削除してください。

1. **インスタンスの「終了 (Terminate)」**:
   - AWSコンソールで「インスタンスを終了」します。
   - **注意**: 「停止 (Stop)」ではなく「終了 (Terminate)」を選んでください。停止だとディスク料金がかかり続けます。
2. **Elastic IP の解放**:
   - 固定IPを取得していた場合は、必ず「解放」してください。未使用のまま放置すると課金されます。
3. **ボリューム (EBS) の確認**:
   - 通常は終了時に消えますが、念のため「ボリューム」一覧で残っていないか確認しましょう。

---
💡 **Tips**: 何かエラーが出たら `docker compose logs -f` でログを確認できます。
