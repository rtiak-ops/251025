# 最新のAmazon Linux 2023 AMI（マシンイメージ）の情報を取得
# これにより、常に最新のOSイメージを使用してインスタンスを起動できます
data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023*-x86_64"]
  }
}

# 仮想サーバー（EC2インスタンス）の作成
resource "aws_instance" "app" {
  ami           = data.aws_ami.amazon_linux_2023.id # 上で取得したOSイメージを指定
  instance_type = "t3.micro"                        # インスタンスのスペック（CPU/メモリ）
  key_name      = var.key_name                      # SSH接続に使用するキーペア名

  subnet_id              = aws_subnet.public[0].id         # 設置するサブネット
  vpc_security_group_ids      = [aws_security_group.ec2.id]     # 適用するセキュリティグループ
  user_data_replace_on_change = true

  # ストレージ（SSD）の設定
  root_block_device {
    volume_size = 20    # 容量（GB単位）
    volume_type = "gp3" # 最新世代の汎用SSD
  }

  tags = {
    Name = "${var.project_name}-ec2"
  }

  # ユーザーデータ：インスタンス起動時に自動実行されるスクリプト
  # Dockerの導入、ソースコードの取得、環境設定、そしてコンテナの起動をすべて自動化します
  user_data = <<-EOF
              #!/bin/bash
              # 1. メモリ不足対策 (Swap設定: 2GB)
              # t3.micro(1GBメモリ)でのビルド落ちを防ぐために必須の設定です
              fallocate -l 2G /swapfile
              chmod 600 /swapfile
              mkswap /swapfile
              swapon /swapfile
              echo '/swapfile swap swap defaults 0 0' >> /etc/fstab

              # 2. システムの更新と必要なツールのインストール
              dnf update -y
              dnf install -y docker git
              # Docker Compose (V2) のインストール
              dnf install -y docker-compose-plugin
              
              # 3. Dockerサービスの起動と権限設定
              systemctl start docker
              systemctl enable docker
              usermod -a -G docker ec2-user

              # 4. プロジェクトディレクトリの準備
              mkdir -p /home/ec2-user/251025
              chown ec2-user:ec2-user /home/ec2-user/251025

              # 5. ソースコードの取得
              sudo -u ec2-user git clone https://github.com/rtiak-ops/251025.git /home/ec2-user/251025 || (cd /home/ec2-user/251025 && sudo -u ec2-user git pull)

              # 6. .env ファイルの自動生成 (ルートディレクトリ)
              cat <<EOT > /home/ec2-user/251025/.env
              DATABASE_URL=postgresql+asyncpg://postgresMaster:${var.db_password}@${aws_db_instance.main.endpoint}/todo_db
              POSTGRES_USER=postgresMaster
              POSTGRES_PASSWORD=${var.db_password}
              POSTGRES_DB=todo_db
              SECRET_KEY=cc45304918e7e237303f23497d5a5706
              ENV=production
              CORS_ORIGINS=https://${aws_cloudfront_distribution.main.domain_name}
              EOT
              chown ec2-user:ec2-user /home/ec2-user/251025/.env

              # 7. コンテナの起動
              # メモリを節約しながらビルド・起動します
              cd /home/ec2-user/251025
              docker compose up -d --build
              
              # 8. データベースの初期化
              # コンテナが立ち上がるまで最長60秒待機
              for i in {1..12}; do
                docker compose exec -T backend alembic upgrade head && break
                sleep 5
              done
              EOF
}
