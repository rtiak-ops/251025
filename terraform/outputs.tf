# ==========================================
# 実行結果出力 (Outputs)
# ==========================================

# ブラウザからアプリケーションにアクセスするためのパブリック IP アドレス
output "ec2_public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = aws_eip.app.public_ip
}

# データベースに接続するためのアドレス
output "rds_endpoint" {
  description = "Connection endpoint for the RDS instance"
  value       = aws_db_instance.main.endpoint
}

# フロントエンド配信用 (CloudFront) のドメイン名
output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.domain_name
}

# フロントエンドのファイルをアップロードする先の S3 バケット名
output "s3_bucket_name" {
  description = "Name of the S3 bucket used for frontend hosting"
  value       = aws_s3_bucket.frontend.id
}

# CI/CD (GitHub Actions) 等でキャッシュクリアを行う際に必要なID
output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution for invalidation"
  value       = aws_cloudfront_distribution.main.id
}

