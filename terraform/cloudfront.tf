# CloudFrontからS3バケットへの安全なアクセスを管理するための設定 (OAC: Origin Access Control)
# S3バケットを公開せずに、CloudFront経由でのみファイルを配信するために必要です
resource "aws_cloudfront_origin_access_control" "main" {
  name                              = "${var.project_name}-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFrontディストリビューション（CDN）の作成
# 世界中の拠点からコンテンツを高速に配信し、HTTPS化も行います
resource "aws_cloudfront_distribution" "main" {
  # 配信元（オリジン）の設定 1: S3バケット (フロントエンド)
  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.frontend.bucket}"
    origin_access_control_id = aws_cloudfront_origin_access_control.main.id
  }

  # 配信元（オリジン）の設定 2: EC2インスタンス (バックエンドAPI)
  origin {
    domain_name = aws_instance.app.public_dns != "" ? aws_instance.app.public_dns : aws_instance.app.public_ip
    origin_id   = "EC2-${aws_instance.app.id}"

    custom_origin_config {
      http_port                = 8000
      https_port               = 443
      origin_protocol_policy   = "http-only" # EC2側はHTTP(8000)で受けるため
      origin_ssl_protocols     = ["TLSv1.2"]
    }
  }

  enabled             = true
  is_ipv6_enabled    = true
  default_root_object = "index.html" # ルート（/）にアクセスした際に返すファイル

  # キャッシュの挙動設定
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"] # 許可するHTTPメソッド
    cached_methods   = ["GET", "HEAD"]            # キャッシュするメソッド
    target_origin_id = "S3-${aws_s3_bucket.frontend.bucket}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https" # 全てのアクセスをHTTPSに転送
    min_ttl                = 0
    default_ttl            = 3600    # デフォルトのキャッシュ有効期間（1時間）
    max_ttl                = 86400  # 最大のキャッシュ有効期間（1日）
  }

  # バックエンドAPI用のルーティング設定 (/auth/*, /todos/*, /ai/*)
  # これらのパスへのアクセスはEC2に転送し、キャッシュさせない設定にします
  ordered_cache_behavior {
    path_pattern     = "/auth/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "EC2-${aws_instance.app.id}"

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Content-Type"] # 認証に必要なヘッダーを転送

      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
  }

  ordered_cache_behavior {
    path_pattern     = "/todos/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "EC2-${aws_instance.app.id}"

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Content-Type"]

      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
  }

  ordered_cache_behavior {
    path_pattern     = "/ai/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "EC2-${aws_instance.app.id}"

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Content-Type"]

      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
  }

  # シングルページアプリケーション(SPA)のためのエラー応答設定
  # 存在しないパスにアクセスが来ても index.html を返し、フロントエンド側でルーティングを行えるようにします
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
  }

  # 地理的制限（ここでは特に制限なし）
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # SSL/TLS証明書の設定（CloudFrontのデフォルトドメイン用の証明書を使用）
  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name = "${var.project_name}-cloudfront"
  }
}
