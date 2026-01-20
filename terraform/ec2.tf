# ==================================================================================================
# 3. 仮想サーバー (EC2)
# ==================================================================================================
# アプリケーションを動かすための「コンピューター」をレンタルします。

# --------------------------------------------------------------------------------------------------
# ① OSイメージ（AMI）の選択
# --------------------------------------------------------------------------------------------------
# どの「OS（WindowsかMacかLinuxか）」を入れるかを決めます。
# ここでは「Amazon Linux 2023」という最新のLinux OSを自動で探してくる設定にしています。
data "aws_ami" "amazon_linux_2023" {              # OS（Amazon Linux 2023）の情報を取得します
  most_recent = true                            # 最新のバージョンを選びます
  owners      = ["amazon"]                      # AWS公式が提供しているものに限定します

  filter {                                      # 検索条件を指定します
    name   = "name"                             # 名前で検索します
    values = ["al2023-ami-2023*-x86_64"]        # Amazon Linux 2023の標準的な名前を指定します
  }                                             # フィルター終了
}                                               # 情報取得終了

# --------------------------------------------------------------------------------------------------
# ② サーバー本体の設定
# --------------------------------------------------------------------------------------------------
resource "aws_instance" "app" {                  # サーバー本体（インスタンス）を作ります
  ami           = data.aws_ami.amazon_linux_2023.id # さっき選んだOS（AMI ID）を使います
  instance_type = "t3.micro"                        # サーバーの「馬力（スペック）」。安くてテストに最適です。
  key_name      = var.key_name                      # SSHログインに使うための「合鍵」の名前です

  subnet_id              = aws_subnet.public[0].id         # 公開エリア（パブリックサブネット）の1つ目に設置します
  vpc_security_group_ids      = [aws_security_group.ec2.id]     # サーバー用の「門番（セキュリティグループ）」を指定します
  iam_instance_profile   = aws_iam_instance_profile.ec2_ssm_profile.name # SSMログイン用の権限を付与します
  user_data_replace_on_change = true                # 自動セットアップの内容を変えたらサーバーを作り直します

  # 記憶装置（SSD）：パソコンのCドライブのようなもの
  root_block_device {                               # ストレージ（SSD）の設定です
    volume_size = 20                                # 容量を20GB確保します
    volume_type = "gp3"                             # 高性能でコスパの良い第3世代SSDを使います
  }                                                 # ストレージ設定終了

  tags = {                                          # タグ（名札）を付けます
    Name = "${var.project_name}-ec2"                # プロジェクト名＋ec2 という名前にします
  }                                                 # タグ設定終了

  # --------------------------------------------------------------------------------------------------
  # ③ 自動セットアップ（User Data）：サーバー起動時に「勝手にお願い！」する作業リスト
  # --------------------------------------------------------------------------------------------------
  # サーバーが生まれた瞬間に、Dockerをインストールしたり、アプリを動かしたりする命令を書いています。
  user_data = <<-EOF
              #!/bin/bash
              # 1. メモリが足りなくなっても大丈夫なように「予備の記憶場所（Swap）」を作る
              fallocate -l 2G /swapfile              # 2GBの巨大なファイルを作ります
              chmod 600 /swapfile                    # 管理者以外は見られないようにします
              mkswap /swapfile                       # スワップ専用の形式に変換します
              swapon /swapfile                       # スワップ機能をONにします
              echo '/swapfile swap swap defaults 0 0' >> /etc/fstab # 起動時に毎回読み込むように登録します

              # 2. 必要なツール（DockerやGit）をインストールする
              dnf update -y                          # OSの全ソフトを最新にします
              dnf install -y docker git              # DockerとGitを導入します
              dnf install -y docker-compose-plugin   # Dockerを楽に動かすプラグインを導入します
              
              # 3. Docker（コンテナを動かす道具）を使えるようにする
              systemctl start docker                 # Dockerを起動します
              systemctl enable docker                # サーバー起動時にDockerも自動で動くようにします
              usermod -a -G docker ec2-user          # 操作ユーザー（ec2-user）にDockerの権限をあげます

              # 4. アプリを入れるフォルダを作る
              mkdir -p /home/ec2-user/251025         # アプリ用の部屋を作ります
              chown ec2-user:ec2-user /home/ec2-user/251025 # 部屋の持ち主を操作ユーザーにします

              # 5. アプリのソースコードをGitHubから持ってくる
              sudo -u ec2-user git clone https://github.com/rtiak-ops/251025.git /home/ec2-user/251025 || (cd /home/ec2-user/251025 && sudo -u ec2-user git pull)

              # 6. アプリの設定ファイル（.env）をこっそり作る
              cat <<EOT > /home/ec2-user/251025/.env
              DATABASE_URL=postgresql+asyncpg://postgresMaster:${var.db_password}@${aws_db_instance.main.endpoint}/todo_db
              POSTGRES_USER=postgresMaster
              POSTGRES_PASSWORD=${var.db_password}
              POSTGRES_DB=todo_db
              SECRET_KEY=${var.secret_key}
              ENV=production
              DEBUG=false
              CORS_ORIGINS=http://${aws_eip.app.public_ip},http://localhost,http://localhost:5173
              VITE_API_BASE_URL=http://${aws_eip.app.public_ip}
              DOMAIN_NAME=${aws_eip.app.public_ip}
              GOOGLE_API_KEY=${var.google_api_key}
              EOT
              chown ec2-user:ec2-user /home/ec2-user/251025/.env # 設定ファイルの持ち主も操作ユーザーにします

              # 7. アプリ（コンテナ）を起動する！
              cd /home/ec2-user/251025               # アプリの部屋に移動します
              docker compose up -d --build           # アプリをビルドしてバックグラウンドで動かします
              
              # 8. データベースの骨組みを作る（初期化）
              for i in {1..12}; do                   # 最大1分間（5秒x12回）待ちます
                docker compose exec -T backend alembic upgrade head && break # テーブル作成に成功したらループを抜けます
                sleep 5                              # 失敗したら5秒待って再挑戦します
              done                                   # 繰り返し終了
              EOF
}                                                 # サーバー設定終了

# --------------------------------------------------------------------------------------------------
# ④ 固定IPアドレス (Elastic IP) の設定
# --------------------------------------------------------------------------------------------------
# サーバーを再起動しても住所（IPアドレス）が変わらないように固定します。
resource "aws_eip" "app" {
  domain   = "vpc"

  tags = {
    Name = "${var.project_name}-eip"
  }
}

# インスタンスとEIPを紐付けます（循環参照を避けるために分離しています）
resource "aws_eip_association" "eip_assoc" {
  instance_id   = aws_instance.app.id
  allocation_id = aws_eip.app.id
}

