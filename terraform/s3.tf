# フロントエンドの静的ファイルを保存するためのS3バケットを作成
# バケット名は全世界で一意（ユニーク）である必要があるため、アカウントIDを末尾に付加しています
resource "aws_s3_bucket" "frontend" {
  bucket = "${var.project_name}-frontend-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name = "${var.project_name}-frontend-bucket"
  }
}

# S3バケットへの外部からの直接アクセスをすべて禁止する設定
# セキュリティを高めるために、ウェブサイトへのアクセスはCloudFront経由に限定します
resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3バケットポリシーの設定
# 指定したS3バケットに対して、どのアクセスを許可するかを定義します
resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  policy = data.aws_iam_policy_document.s3_policy.json
}

# CloudFrontからのアクセスのみを許可するポリシーの定義
# これにより、ユーザーはS3のURLを直接叩くことはできず、CloudFront経由でのみファイルを閲覧できます
data "aws_iam_policy_document" "s3_policy" {
  statement {
    actions   = ["s3:GetObject"] # オブジェクト（ファイル）の取得のみを許可
    resources = ["${aws_s3_bucket.frontend.arn}/*"] # バケット内の全ファイルが対象

    # 許可を与える相手としてCloudFrontサービスを指定
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    # 特定のCloudFrontディストリビューションからのアクセスのみを条件として設定
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.main.arn]
    }
  }
}

# AWSアカウントIDなどの現在の認証情報を取得するためのデータソース
data "aws_caller_identity" "current" {}
