# データベースを配置するサブネットグループを定義
# 冗長性のために、複数のアベイラビリティゾーン（プライベートサブネット）を跨いで設定します
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

# マネージド型データベースサービス（RDS）の作成
resource "aws_db_instance" "main" {
  identifier        = "${var.project_name}-db" # インスタンス名
  engine            = "postgres"             # 使用するデータベースエンジン
  engine_version    = "17"                   # エンジンのバージョン
  instance_class    = "db.t3.micro"          # インスタンスのスペック
  allocated_storage = 20                     # ストレージ容量（GB単位）
  storage_type      = "gp2"                  # ストレージのタイプ

  db_name  = "todo_db"           # 初回作成時に作られるデータベース名
  username = "postgresMaster"    # マスターユーザー名
  password = var.db_password     # マスターパスワード（変数から取得）

  db_subnet_group_name   = aws_db_subnet_group.main.name     # 上で作ったサブネットグループを指定
  vpc_security_group_ids = [aws_security_group.rds.id]       # 適用するセキュリティグループ
  skip_final_snapshot    = true                              # 削除時にバックアップを作成しない（開発用設定）

  tags = {
    Name = "${var.project_name}-rds"
  }
}
