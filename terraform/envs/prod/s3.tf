# ==========================================
# ストレージ (S3) 設定
# ==========================================

# ------------------------------------------
# 1. フロントエンドホスティング用バケット
# ------------------------------------------

# React 等の静的ファイルを配信するための S3 バケット
resource "aws_s3_bucket" "frontend" {
  # バケット名は全世界で一意である必要があるため、プロジェクト名とアカウントIDを組み合わせて生成
  bucket        = "${var.project_name}-frontend-${data.aws_caller_identity.current.account_id}"
  # Terraform 削除時に、中身のファイル（オブジェクト）があっても強制的に削除する設定
  force_destroy = true

  tags = {
    Name = "${var.project_name}-frontend-bucket"
  }
}

# ------------------------------------------
# 2. セキュリティ設定 (パブリックアクセス遮断)
# ------------------------------------------

# S3 バケット自体をインターネットに直接公開せず、安全な状態に保つ設定
# ※ CloudFront (OAC) 経由でのみアクセスを許可するため、直接のパブリックアクセスは全て拒否します。
resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true # パブリック ACL のブロック (ACL を使ったパブリックアクセスを禁止)
  block_public_policy     = true # パブリックバケットポリシーのブロック (ポリシーを使ったパブリックアクセスを禁止)
  ignore_public_acls      = true # パブリック ACL の無視 (既存のパブリック ACL も無視)
  restrict_public_buckets = true # パブリックバケットへのアクセス制限 (パブリックバケットへのアクセスを AWS 認証済みユーザーに限定)
}

# ------------------------------------------
# 3. バケットポリシー (アクセス許可)
# ------------------------------------------

# CloudFront からのアクセスのみを許可するポリシーをバケットにアタッチ
resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  policy = data.aws_iam_policy_document.s3_policy.json
}

# ポリシー内容の定義
data "aws_iam_policy_document" "s3_policy" {
  statement {
    # ファイルの読み取り (GetObject) を許可
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.frontend.arn}/*"]

    # 許可対象: CloudFront サービス
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    # セキュリティ制約: 特定の CloudFront ディストリビューションからのリクエストのみを許可
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.main.arn]
    }
  }
}

# AWSアカウント情報の取得
data "aws_caller_identity" "current" {}
