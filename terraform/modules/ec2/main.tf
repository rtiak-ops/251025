data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023*-x86_64"]
  }
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.amazon_linux_2023.id
  instance_type = var.instance_type
  key_name      = var.key_name

  subnet_id                   = var.public_subnet_id
  vpc_security_group_ids      = [var.ec2_sg_id]
  iam_instance_profile        = var.iam_instance_profile_name
  user_data_replace_on_change = true

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  tags = {
    Name = "${var.project_name}-ec2"
  }

  user_data = <<-EOF
              #!/bin/bash
              # 1. スワップ領域の確保
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
              mkdir -p /home/ec2-user/learning-app
              chown ec2-user:ec2-user /home/ec2-user/learning-app
              sudo -u ec2-user git clone https://github.com/rtiak-ops/learning-app.git /home/ec2-user/learning-app || (cd /home/ec2-user/learning-app && sudo -u ec2-user git pull)

              # 5. アプリ用環境変数の設定 (.env 生成)
              cat <<EOT > /home/ec2-user/learning-app/.env
              DATABASE_URL=postgresql+asyncpg://postgresMaster:${var.db_password}@${var.rds_endpoint}/todo_db
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
              chown ec2-user:ec2-user /home/ec2-user/learning-app/.env

              # 6. コンテナのビルド・起動
              cd /home/ec2-user/learning-app
              docker compose up -d --build
              
              # 7. DB マイグレーション
              for i in {1..12}; do
                docker compose exec -T backend alembic upgrade head && break
                sleep 5
              done
              EOF
}

resource "aws_eip" "app" {
  domain = "vpc"

  tags = {
    Name = "${var.project_name}-eip"
  }
}

resource "aws_eip_association" "eip_assoc" {
  instance_id   = aws_instance.app.id
  allocation_id = aws_eip.app.id
}
