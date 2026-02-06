# ==========================================
# 仮想サーバー (EC2) 設定
# ==========================================

# ------------------------------------------
# 1. OS イメージ (AMI) の選択
# ------------------------------------------

# 最新の Amazon Linux 2023 (x86_64) を自動選択
data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023*-x86_64"]
  }
}

# ------------------------------------------
# 2. EC2 インスタンス本体
# ------------------------------------------

resource "aws_instance" "app" {
  ami           = data.aws_ami.amazon_linux_2023.id
  instance_type = "t3.micro" # 無料枠が利用可能な小型インスタンス
  key_name      = var.key_name

  subnet_id                   = aws_subnet.public[0].id            # パブリックサブネットに配置
  vpc_security_group_ids      = [aws_security_group.ec2.id]         # セキュリティグループ適用
  iam_instance_profile        = aws_iam_instance_profile.ec2_ssm_profile.name # Session Manager 使用用の権限
  user_data_replace_on_change = true                                # 起動スクリプト変更時にインスタンスを再作成する設定

  # ディスク (EBS) 設定
  root_block_device {
    volume_size = 20    # 20GB (Docker イメージなどの保存を考慮)
    volume_type = "gp3" # 最新世代の汎用 SSD
  }

  tags = {
    Name = "${var.project_name}-ec2"
  }

  # ------------------------------------------
  # 3. 起動スクリプト (User Data)
  # インスタンス起動時に自動で実行されるセットアップ手順
  # ------------------------------------------
  user_data = <<-EOF
              #!/bin/bash
              # 1. スワップ領域の確保
              # t3.micro のメモリ不足を補うために 2GB のスワップファイルを作成
              fallocate -l 2G /swapfile
              chmod 600 /swapfile
              mkswap /swapfile
              swapon /swapfile
              echo '/swapfile swap swap defaults 0 0' >> /etc/fstab

              # 2. 基本ソフトのインストール
              dnf update -y
              dnf install -y docker git
              
              # Docker Compose V2 のインストール
              mkdir -p /usr/local/lib/docker/cli-plugins
              curl -SL https://github.com/docker/compose/releases/download/v2.24.1/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose
              chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
              
              # 3. Docker の有効化
              systemctl start docker
              systemctl enable docker
              usermod -a -G docker ec2-user

              # 4. ソースコードのチェックアウト
              mkdir -p /home/ec2-user/251025
              chown ec2-user:ec2-user /home/ec2-user/251025
              sudo -u ec2-user git clone https://github.com/rtiak-ops/251025.git /home/ec2-user/251025 || (cd /home/ec2-user/251025 && sudo -u ec2-user git pull)

              # 5. アプリ用環境変数の設定 (.env 生成)
              cat <<EOT > /home/ec2-user/251025/.env
              DATABASE_URL=postgresql+asyncpg://postgresMaster:${var.db_password}@${aws_db_instance.main.endpoint}/todo_db
              POSTGRES_USER=postgresMaster
              POSTGRES_PASSWORD=${var.db_password}
              POSTGRES_DB=todo_db
              SECRET_KEY=${var.secret_key}
              ENV=${var.environment}
              DEBUG=false
              CORS_ORIGINS=http://${aws_eip.app.public_ip},http://localhost,http://localhost:5173
              VITE_API_BASE_URL=http://${aws_eip.app.public_ip}
              DOMAIN_NAME=${aws_eip.app.public_ip}
              GOOGLE_API_KEY=${var.google_api_key}
              EOT
              chown ec2-user:ec2-user /home/ec2-user/251025/.env

              # 6. コンテナのビルド・起動
              cd /home/ec2-user/251025
              docker compose up -d --build
              
              # 7. DB マイグレーション
              # DB 起動を待つために繰り返し実行を試行
              for i in {1..12}; do
                docker compose exec -T backend alembic upgrade head && break
                sleep 5
              done
              EOF
}

# ------------------------------------------
# 4. 固定 IP アドレス (Elastic IP) 設定
# ------------------------------------------

# サーバーを再起動しても IP アドレスが変わらないように固定化
resource "aws_eip" "app" {
  domain = "vpc"

  tags = {
    Name = "${var.project_name}-eip"
  }
}

# 作成した Elastic IP を EC2 インスタンスに紐付け
resource "aws_eip_association" "eip_assoc" {
  instance_id   = aws_instance.app.id
  allocation_id = aws_eip.app.id
}

