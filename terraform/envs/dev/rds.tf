# ==========================================
# データベース (RDS) 設定
# ==========================================

# ------------------------------------------
# 1. DB サブネットグループ
# ------------------------------------------

# RDS データベースを配置する専用のネットワークグループ
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id # セキュリティのためプライベートサブネットに配置

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

# ------------------------------------------
# 2. RDS インスタンス (PostgreSQL)
# ------------------------------------------

resource "aws_db_instance" "main" {
  identifier        = "${var.project_name}-db"
  allocated_storage = 20           # 容量 (20GB)
  storage_type      = "gp3"        # 汎用 SSD
  engine            = "postgres"
  engine_version    = "17"         # PostgreSQL 17
  instance_class    = "db.t3.micro" # 無料枠が利用可能なインスタンスクラス

  db_name  = "todo_db"        # 初期データベース名
  username = "postgresMaster" # 管理者ユーザー名
  password = var.db_password  # variables.tf から取得

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id] # RDS 用セキュリティグループ

  skip_final_snapshot = true  # テスト/学習用のため削除時のバックアップをスキップ
  publicly_accessible = false # インターネットからの直接接続を遮断 (EC2 等からのアクセスのみ許可)
  apply_immediately   = true  # 設定変更を即座に反映

  tags = {
    Name = "${var.project_name}-rds"
  }
}
