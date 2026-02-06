# ==========================================
# 実行結果出力 (Outputs)
# ==========================================

output "ec2_public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = module.ec2.ec2_public_ip
}

output "rds_endpoint" {
  description = "Connection endpoint for the RDS instance"
  value       = module.rds.rds_endpoint
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = module.s3_cloudfront.cloudfront_domain_name
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket used for frontend hosting"
  value       = module.s3_cloudfront.s3_bucket_name
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution for invalidation"
  value       = module.s3_cloudfront.cloudfront_id
}

output "github_actions_role_arn" {
  description = "ARN of the IAM role for GitHub Actions"
  value       = module.iam.github_actions_role_arn
}
