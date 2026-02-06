# ==========================================
# セキュリティグループ設定 (ファイアウォール)
# ==========================================

# ------------------------------------------
# 1. CloudFront の IP アドレスリスト取得
# ------------------------------------------

# AWS が管理している CloudFront の IP 範囲を取得
# これを使用することで、特定のサーバーへのアクセスを「CloudFront 経由のみ」に制限できます。
data "aws_ec2_managed_prefix_list" "cloudfront" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

# ------------------------------------------
# 2. EC2 インスタンス用セキュリティグループ
# ------------------------------------------

# アプリケーションサーバーの通信ルール
resource "aws_security_group" "ec2" {
  name        = "${var.project_name}-ec2-sg"
  description = "Security group for EC2 instance"
  vpc_id      = aws_vpc.main.id

  # --- 受信 (Ingress) ルール ---
  
  # HTTP (80番ポート) の許可
  # ※ 開発・動作チェック用（通常は CloudFront 経由）
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] 
  }

  # HTTPS (443番ポート) の許可
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # API サーバー用 (8000番ポート) の許可
  # セキュリティ強化のため、CloudFront からの通信のみを受け入れるように制限
  ingress {
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    prefix_list_ids = [data.aws_ec2_managed_prefix_list.cloudfront.id]
    description     = "Allow API access only from CloudFront"
  }

  # --- 送信 (Egress) ルール ---
  # 外部への全ての通信（パッケージのダウンロード、DB への接続等）を許可
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1" # すべて
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-ec2-sg"
  }
}

# ------------------------------------------
# 3. RDS インスタンス用セキュリティグループ
# ------------------------------------------

# データベースの通信ルール
resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds-sg"
  description = "Security group for RDS instance"
  vpc_id      = aws_vpc.main.id

  # --- 受信 (Ingress) ルール ---
  # アプリケーションサーバー (EC2) からのアクセスのみを許可 (ポート 5432)
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2.id] # EC2 の SG を持つリソースからの接続を許可
  }

  # --- 送信 (Egress) ルール ---
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-rds-sg"
  }
}
