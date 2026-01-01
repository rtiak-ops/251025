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
  vpc_security_group_ids = [aws_security_group.ec2.id]     # 適用するセキュリティグループ

  # ストレージ（SSD）の設定
  root_block_device {
    volume_size = 20    # 容量（GB単位）
    volume_type = "gp3" # 最新世代の汎用SSD
  }

  tags = {
    Name = "${var.project_name}-ec2"
  }

  # ユーザーデータ：インスタンス起動時に自動実行されるスクリプト
  # DockerとGitをインストールし、Dockerサービスを起動します
  user_data = <<-EOF
              #!/bin/bash
              dnf update -y
              dnf install -y docker git
              systemctl start docker
              systemctl enable docker
              usermod -a -G docker ec2-user
              EOF
}
