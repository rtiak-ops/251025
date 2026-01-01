# EC2インスタンスの公開IPアドレス
# サーバーにSSH接続する際や、直接アクセスする際に使用します
output "ec2_public_ip" {
  description = "Public IP of the EC2 instance"
  value       = aws_instance.app.public_ip
}

# RDSインスタンスの接続エンドポイント
# アプリケーションからデータベースに接続するためのホスト名です
output "rds_endpoint" {
  description = "Endpoint of the RDS instance"
  value       = aws_db_instance.main.endpoint
}

# CloudFrontのドメイン名
# ユーザーがフロントエンド（ウェブサイト）にアクセスするための公式なURLになります
output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.domain_name
}

# フロントエンドのファイルを置くS3バケット名
output "s3_bucket_name" {
  description = "Name of the S3 bucket for frontend"
  value       = aws_s3_bucket.frontend.id
}

# CloudFrontのディストリビューションID
# キャッシュクリア（Invalidation）を実行する際に使用します
output "cloudfront_distribution_id" {
  description = "Distribution ID of the CloudFront"
  value       = aws_cloudfront_distribution.main.id
}
