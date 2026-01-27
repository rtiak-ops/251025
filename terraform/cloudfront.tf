# ==========================================
# 配信ネットワーク (CloudFront) 設定
# ==========================================

# ------------------------------------------
# 1. オリジンアクセス制御 (OAC)
# ------------------------------------------

# S3 バケットへの直接アクセスを禁止し、CloudFront 経由のアクセスのみに制限するための設定
# OAC は、CloudFront が S3 バケットのコンテンツに安全にアクセスするための認証メカニニズムを提供します。
resource "aws_cloudfront_origin_access_control" "main" {
  name                              = "${var.project_name}-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always" # すべてのリクエストに署名付き URL/Cookie を要求
  signing_protocol                  = "sigv4"  # AWS の最新の署名プロトコルを使用
}

# ------------------------------------------
# 2. CloudFront ディストリビューション
# ------------------------------------------

# CloudFront ディストリビューションは、コンテンツをユーザーに高速かつ安全に配信するためのグローバルなエッジネットワークサービスです。
# S3 (静的コンテンツ) と EC2 (動的API) の両方をオリジンとして設定し、パスに基づいてルーティングします。
resource "aws_cloudfront_distribution" "main" {

  # オリジン設定 A: S3 (静的コンテンツ・フロントエンド)
  # React/Vue/Angular などの SPA (Single Page Application) の静的ファイルをホストする S3 バケットをオリジンとします。
  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.frontend.bucket}"
    origin_access_control_id = aws_cloudfront_origin_access_control.main.id
  }

  # オリジン設定 B: EC2 (動的 API・バックエンド)
  # Django/Rails/Node.js などのバックエンドアプリケーションが動作する EC2 インスタンスをオリジンとします。
  origin {
    # インスタンスのパブリック DNS または IP を使用して EC2 に振り分け
    domain_name = aws_instance.app.public_dns != "" ? aws_instance.app.public_dns : aws_instance.app.public_ip
    origin_id   = "EC2-${aws_instance.app.id}"

    custom_origin_config {
      http_port              = 8000                         # EC2 インスタンスのアプリケーションがリッスンする HTTP ポート
      https_port             = 443                          # EC2 インスタンスのアプリケーションがリッスンする HTTPS ポート (ここでは使用しない)
      origin_protocol_policy = "http-only"                  # CloudFront から EC2 への通信は HTTP (ポート 8000) を使用
      origin_ssl_protocols   = ["TLSv1.2"]                  # オリジンとの通信に使用する SSL/TLS プロトコル
    }
  }

  enabled             = true                          # ディストリビューションを有効化
  is_ipv6_enabled     = true                          # IPv6 アクセスを許可
  default_root_object = "index.html"                  # ブラウザでルート (/) にアクセスした際に表示するファイル (SPA のエントリポイント)

  # ------------------------------------------
  # 3. キャッシュ動作の設定
  # ------------------------------------------

  # デフォルトの挙動: 全て S3 (フロントエンド) へ
  # API 以外のリクエスト (HTML/CSS/JS/画像など) はこちらで処理し、エッジロケーションでキャッシュします。
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"] # 許可する HTTP メソッド
    cached_methods   = ["GET", "HEAD"]            # キャッシュ対象の HTTP メソッド
    target_origin_id = "S3-${aws_s3_bucket.frontend.bucket}" # この動作が適用されるオリジン

    forwarded_values {
      query_string = false # クエリ文字列はオリジンに転送しない (静的コンテンツのため)
      cookies {
        forward = "none" # クッキーはオリジンに転送しない
      }
    }

    viewer_protocol_policy = "redirect-to-https" # HTTP アクセスを HTTPS に強制リダイレクトし、セキュリティを確保
    default_ttl            = 3600               # デフォルトのキャッシュ期間 (秒)
  }

  # パス別設定 (Ordered Cache Behavior): API 用
  # 特定の URL パスへのリクエストを EC2 オリジンへ振り分けます。
  # API は計算や DB アクセスが伴うため、CloudFront 側でのキャッシュを無効化 (ttl=0) しています。
  # これにより、常に最新のデータがバックエンドから取得されます。

  # /auth/* (認証系 API)
  ordered_cache_behavior {
    path_pattern     = "/auth/*"                                # このキャッシュ動作が適用される URL パターン
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"] # 許可する HTTP メソッド
    cached_methods   = ["GET", "HEAD"]                          # キャッシュ対象の HTTP メソッド (API はキャッシュしないため実質無効)
    target_origin_id = "EC2-${aws_instance.app.id}"             # この動作が適用されるオリジン

    forwarded_values {
      query_string = true                                       # クエリ文字列をオリジンに転送 (API のパラメータとして必要)
      headers      = ["Authorization", "Content-Type", "Origin", "Host"] # 認証情報やコンテンツタイプなどのヘッダーをオリジンに転送
      cookies {
        forward = "all"                                         # すべてのクッキーをオリジンに転送 (セッション管理などに必要)
      }
    }

    viewer_protocol_policy = "redirect-to-https"                # HTTP アクセスを HTTPS に強制リダイレクト
    min_ttl                = 0                                  # 最小キャッシュ期間 (秒) - キャッシュ無効化
    default_ttl            = 0                                  # デフォルトキャッシュ期間 (秒) - キャッシュ無効化
    max_ttl                = 0                                  # 最大キャッシュ期間 (秒) - キャッシュ無効化
  }

  # /todos/* (TODO 操作 API)
  ordered_cache_behavior {
    path_pattern     = "/todos/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "EC2-${aws_instance.app.id}"

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Content-Type", "Origin", "Host"]
      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
  }

  # /projects/* (プロジェクト管理 API)
  ordered_cache_behavior {
    path_pattern     = "/projects/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "EC2-${aws_instance.app.id}"

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Content-Type", "Origin", "Host"]
      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
  }

  # /organizations/* (組織管理 API)
  ordered_cache_behavior {
    path_pattern     = "/organizations/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "EC2-${aws_instance.app.id}"

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Content-Type", "Origin", "Host"]
      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
  }

  # /admin/* (管理者用 API)
  ordered_cache_behavior {
    path_pattern     = "/admin/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "EC2-${aws_instance.app.id}"

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Content-Type", "Origin", "Host"]
      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
  }

  # /monitor/* (監視用 API)
  ordered_cache_behavior {
    path_pattern     = "/monitor/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "EC2-${aws_instance.app.id}"

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Content-Type", "Origin", "Host"]
      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
  }

  # /ai/* (AI 連携 API)
  ordered_cache_behavior {
    path_pattern     = "/ai/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "EC2-${aws_instance.app.id}"

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Content-Type", "Origin", "Host"]
      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
  }

  # /health (ヘルスチェック)
  ordered_cache_behavior {
    path_pattern     = "/health"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "EC2-${aws_instance.app.id}"

    forwarded_values {
      query_string = false
      headers      = ["Origin", "Host"]
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
  }

  # ------------------------------------------
  # 4. エラー応答設定 (SPA 向け)
  # ------------------------------------------

  # 403/404 エラー (ファイルが見つからない等) が発生した場合でも
  # index.html を返すことで、フロントエンドのリダイレクト・ルーティングを維持し、SPA のクライアントサイドルーティングを可能にします。
  custom_error_response {
    error_code         = 403 # アクセス拒否エラー
    response_code      = 200 # クライアントには成功として応答
    response_page_path = "/index.html" # SPA のエントリポイントを返す
  }

  custom_error_response {
    error_code         = 404 # ページが見つからないエラー
    response_code      = 200 # クライアントには成功として応答
    response_page_path = "/index.html" # SPA のエントリポイントを返す
  }

  # 地理的制限設定
  # コンテンツへのアクセスを特定の国に制限したり、特定の国からのアクセスをブロックしたりできます。
  restrictions {
    geo_restriction {
      restriction_type = "none" # 地理的制限なし (全世界からのアクセスを許可)
    }
  }

  # SSL証明書設定
  viewer_certificate {
    cloudfront_default_certificate = true # デフォルトの *.cloudfront.net 証明書を使用 (カスタムドメインを使用しない場合)
  }

  tags = {
    Name = "${var.project_name}-cloudfront"
  }
}
