output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.main.domain_name
}

output "cloudfront_id" {
  value = aws_cloudfront_distribution.main.id
}

output "s3_bucket_name" {
  value = aws_s3_bucket.frontend.bucket
}
