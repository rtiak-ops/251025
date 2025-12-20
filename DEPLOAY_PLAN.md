# 🚀 AWS EC2 サクッとデプロイガイド (HTTP版)

このガイドでは、AWSの無料枠を活用して、ToDoアプリを最短ルート（HTTP）で公開し、動作確認が終わったらすぐに削除する手順を解説します。

---

## 📅 全体の流れ
1. **AWS コンソール操作**: サーバー（EC2）を借りる
2. **接続**: 自分の PC からサーバーにログインする
3. **準備**: サーバーに Docker などの必要なソフトを入れる
4. **デプロイ**: アプリを動かす
5. **後片付け**: 課金されないようにサーバーを消す

---

## 🛠️ ステップ 1: AWS でサーバーを借りる (EC2)

1. **EC2 ダッシュボードへ**:
   - AWS コンソールで「EC2」を検索し、[インスタンスを起動] をクリックします。

2. **基本設定**:
   - **名前**: `todo-app-test`
   - **OS (AMI)**: `Amazon Linux 2023` (Free Tier eligible)
   - **インスタンスタイプ**: `t3.micro` (無料枠対象)

3. **キーペア (ログイン用鍵)**:
   - [新しいキーペアの作成] をクリック。
   - 名前: `todo-key`
   - 形式: `.pem`
   - **大切**: ダウンロードしたファイルは安全な場所に保存してください。

4. **ネットワーク設定 (重要)**:
   - [編集] をクリック。
   - **セキュリティグループ規則**:
     - `SSH`: ポート 22 (ソース: 自分のIP)
     - `HTTP`: ポート 80 (ソース: Anywhere 0.0.0.0/0)
     - ※ポート 443 は今回は不要です。

5. **起動**:
   - 右下の [インスタンスを起動] をクリック。

---

## 🛠️ ステップ 2: サーバーにログインする (SSH)

1. **IPアドレスを確認**:
   - インスタンス一覧から、作成したものの「パブリック IPv4 アドレス」をコピーします (例: `54.12.34.56`)。

2. **接続する**:
   - ターミナル（PowerShell等）を開き、鍵がある場所に移動して実行：
   ```bash
   ssh -i "todo-key.pem" ec2-user@あなたのIPアドレス
   ```

---

## 🛠️ ステップ 3: サーバーのセットアップ

サーバー内で以下のコマンドを順番に実行してください。

1. **Docker のインストール**:
   ```bash
   sudo dnf update -y
   sudo dnf install -y docker
   sudo systemctl start docker
   sudo systemctl enable docker
   sudo usermod -aG docker ec2-user
   ```

2. **Docker Compose のインストール**:
   ```bash
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

3. **再ログイン**:
   - グループ設定反映のため、一度ログアウトして再ログインします。
   ```bash
   exit
   ssh -i "todo-key.pem" ec2-user@あなたのIPアドレス
   ```

---

## 🛠️ ステップ 4: アプリの起動

1. **ソースコードを取得**:
   ```bash
   git clone https://github.com/rtiak-ops/251025
   cd 251025
   ```

2. **設定の確認 (重要)**:
   - 今回は HTTP で動かすため、設定が以下のようになっているか確認してください：
   - `frontend/nginx.conf.template` で `return 301 https://...` がコメントアウトされていること。
   - `docker-compose.yml` の `DOMAIN_NAME` が `localhost` 等になっていること。

3. **起動**:
   ```bash
   docker-compose up -d --build
   ```

4. **動作確認**:
   - ブラウザで `http://あなたのパブリックIPアドレス` を開きます。
   - ToDoの追加やAI機能が動けば成功です！ 🎉

---

## � (参考) 永続化・HTTPS 化したい場合
もし「すぐ消さずに使い続けたい」となった場合は、追加で以下の作業が必要です：
1. **ドメイン取得**: Route 53 等でドメインを取得し、IPを紐付ける
2. **証明書取得**: Certbot を使って SSL 証明書を発行する
3. **Nginx設定の戻し**: `nginx.conf.template` の HTTPS セクションを有効化する

---

## 🧹 ステップ 5: 後片付け (超重要)
**使い終わったら必ず消しましょう。放置すると無料枠を超えて課金される可能性があります。**

1. AWSコンソールで対象のインスタンスを選択。
2. [インスタンスの状態] -> **[インスタンスを終了]** をクリック。
   - ※「停止」ではなく「終了(Terminate)」です。これでサーバーが削除され、課金が止まります。
3. 左メニュー [Elastic IP] を確認し、もしあれば「解放」してください（今回は割り当てていなければ不要です）。
