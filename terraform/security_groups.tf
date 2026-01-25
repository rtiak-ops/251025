# ==================================================================================================
# 門番（Security Groups）：通信のルールを決める
# ==================================================================================================

# CloudFrontのIPアドレスリスト（Prefix List）を取得します
data "aws_ec2_managed_prefix_list" "cloudfront" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

resource "aws_security_group" "ec2" {             # サーバー（EC2）用の門番ルールを作ります
  name        = "${var.project_name}-ec2-sg"      # 門番に名前（プロジェクト名＋ec2-sg）を付けます
  description = "Security group for EC2 instance" # どんな門番か、説明書きをします
  vpc_id      = aws_vpc.main.id                   # この門番を配置する街（VPC）を指定します

  # ingress {                                  # 入口のルール（外から中へ）を決めます
  #   from_port   = 22                         # 22番ポート（SSH）から
  #   to_port     = 22                         # 22番ポートまでを開けます
  #   protocol    = "tcp"                      # TCPという通信方式を使います
  #   # 【セキュリティ】SSM経由でのログインに変更したため、直接のSSHは閉じます
  #   cidr_blocks = ["0.0.0.0/0"]              
  # }                                          # SSHルールの終了

  ingress {                     # 次の入口ルールを決めます
    from_port   = 80            # 80番ポート（HTTP）から
    to_port     = 80            # 80番ポートまでを開けます
    protocol    = "tcp"         # TCP通信です
    cidr_blocks = ["0.0.0.0/0"] # 世界中からサイトを見れるようにします
  }                             # HTTPルールの終了

  ingress {                     # 次の入口ルールを決めます
    from_port   = 443           # 443番ポート（HTTPS）から
    to_port     = 443           # 443番ポートまでを開けます
    protocol    = "tcp"         # TCP通信です
    cidr_blocks = ["0.0.0.0/0"] # 安全な接続（HTTPS）を許可します
  }                             # HTTPSルールの終了

  ingress {                                                              # APIサーバー（8000番）へのアクセス設定
    from_port       = 8000                                               # 8000番ポートを
    to_port         = 8000                                               # 開けます
    protocol        = "tcp"                                              # TCP通信です
    prefix_list_ids = [data.aws_ec2_managed_prefix_list.cloudfront.id]   # 重要：CloudFrontからのアクセスだけを許可します
    description     = "Allow API access from CloudFront"                 # 説明書きです
  }                                                                      # APIルールの終了

  egress {                      # 出口のルール（中から外へ）を決めます
    from_port   = 0             # 全てのポートから
    to_port     = 0             # 全てのポートへ
    protocol    = "-1"          # 通信の種類も何でもOK（-1は全許可）
    cidr_blocks = ["0.0.0.0/0"] # 世界中のどこへでも通信しに行けるようにします
  }                             # 出口ルールの終了

  tags = {                              # タグ（ふせん）を付けます
    Name = "${var.project_name}-ec2-sg" # 管理画面で見やすいように名前を付けます
  }                                     # タグの終了
}                                       # ec2門番の設定終了

resource "aws_security_group" "rds" {             # データベース（RDS）用の門番ルールを作ります
  name        = "${var.project_name}-rds-sg"      # 門番に名前を付けます
  description = "Security group for RDS instance" # 説明書きです
  vpc_id      = aws_vpc.main.id                   # 街（VPC）を指定します

  ingress {                                       # 入口のルールを決めます
    from_port       = 5432                        # 5432番ポート（PostgreSQL用）を開けます
    to_port         = 5432                        # 5432番ポートまでです
    protocol        = "tcp"                       # TCP通信です
    security_groups = [aws_security_group.ec2.id] # 重要：EC2門番を通った仲間だけを通します
  }                                               # DB入口ルールの終了

  egress {                      # 出口のルールを決めます
    from_port   = 0             # 全てのポートを
    to_port     = 0             # 全てのポートへ
    protocol    = "-1"          # 何でも許可します
    cidr_blocks = ["0.0.0.0/0"] # どこへでも通信OKにします
  }                             # 出口ルールの終了

  tags = {                              # タグを付けます
    Name = "${var.project_name}-rds-sg" # 名前タグです
  }                                     # タグの終了
}                                       # rds門番の設定終了
