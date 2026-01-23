# ==================================================================================================
# 4. データベース (RDS)
# ==================================================================================================

resource "aws_db_subnet_group" "main" {      # データベースを置くグループ（住所録）を作ります
  name       = "${var.project_name}-db-subnet-group" # グループに名前を付けます
  subnet_ids = aws_subnet.private[*].id     # 全ての秘密エリア（プライベートサブネット）を対象にします

  tags = {                                   # タグを付けます
    Name = "${var.project_name}-db-subnet-group" # 名前タグです
  }                                          # タグ設定終了
}                                           # サブネットグループ設定終了

resource "aws_db_instance" "main" {          # データベース本体を作ります
  identifier        = "${var.project_name}-db" # データベースサーバーの名前を決めます
  allocated_storage = 20                     # 保存できる容量を20GBにします
  storage_type      = "gp3"                  # 高性能なSSDを使います
  engine            = "postgres"             # PostgreSQLという種類のシステムを使います
  engine_version    = "17"                   # バージョンは17にします
  instance_class    = "db.t4g.micro"          # サーバーの馬力を指定します（コスト効率の良いGravitonインスタンス）
  
  db_name  = "todo_db"                     # 最初から作っておくデータの引き出し名です
  username = "postgresMaster"              # 管理者（マスター）の名前を決めます
  password = var.db_password               # パスワードを別のファイルから読み込みます
  
  db_subnet_group_name   = aws_db_subnet_group.main.name # 作った住所録（グループ名）を指定します
  vpc_security_group_ids = [aws_security_group.rds.id]   # データベース用の門番を立たせます
  
  skip_final_snapshot = true                 # 削除する時にバックアップを取らないようにします（節約）
  publicly_accessible = false                # インターネットから直接見えないように隠します
  apply_immediately   = true                 # 変更をすぐに適用します（節約設定の反映）

  tags = {                                   # タグを付けます
    Name = "${var.project_name}-rds"        # 名前タグです
  }                                          # タグ設定終了
}                                           # データベース本体の設定終了
