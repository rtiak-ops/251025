# ==================================================================================================
# 6. 配信ネットワーク (CloudFront)
# ==================================================================================================

resource "aws_cloudfront_origin_access_control" "main" { # S3へのアクセスを安全に制御する鍵を作ります
  name                              = "${var.project_name}-oac" # 鍵に名前を付けます
  origin_access_control_origin_type = "s3"                  # S3用の鍵です
  signing_behavior                  = "always"             # 常に署名（ハンコ）をします
  signing_protocol                  = "sigv4"              # 最新の署名方式を使います
}                                                           # 鍵設定終了

resource "aws_cloudfront_distribution" "main" {              # 配信システム本体（司令塔）を作ります
  
  origin {                                                   # 1つ目のデータ元（オリジン）を登録します
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name # さっき作ったS3バケットの住所です
    origin_id                = "S3-${aws_s3_bucket.frontend.bucket}" # データ元のニックネームを付けます
    origin_access_control_id = aws_cloudfront_origin_access_control.main.id # 作った鍵を使います
  }                                                          # 1つ目のオリジン終了

  origin {                                                   # 2つ目のデータ元を登録します
    domain_name = aws_instance.app.public_dns != "" ? aws_instance.app.public_dns : aws_instance.app.public_ip # サーバー（EC2）の住所です
    origin_id   = "EC2-${aws_instance.app.id}"              # ニックネームです

    custom_origin_config {                                   # サーバーへの接続設定を細かく書きます
      http_port                = 8000                        # アプリが使っている8000番ポートを指定します
      https_port               = 443                         # 標準の443番も一応設定します
      origin_protocol_policy   = "http-only"                 # 司令塔とサーバーの間はHTTPで通信します
      origin_ssl_protocols     = ["TLSv1.2"]                 # 通信の暗号化ルールを指定します
    }                                                        # 詳細設定終了
  }                                                          # 2つ目のオリジン終了

  enabled             = true                                 # 配信システムを稼働（ON）にします
  is_ipv6_enabled    = true                                 # 新しい形式の住所（IPv6）にも対応させます
  default_root_object = "index.html"                         # サイトにアクセスして最初に見せるファイルです

  default_cache_behavior {                                   # 通常（フロントエンド）の通信ルールを決めます
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]            # 許可するアクセスの種類です
    cached_methods   = ["GET", "HEAD"]                      # キャッシュ（一時保存）するアクセスの種類です
    target_origin_id = "S3-${aws_s3_bucket.frontend.bucket}" # この通信はS3バケットに繋げます

    forwarded_values {                                       # 通信の時に伝える情報を決めます
      query_string = false                                   # 余計な情報は伝えません
      cookies {                                              # クッキー情報です
        forward = "none"                                     # クッキーも伝えません
      }                                                      # クッキー設定終了
    }                                                        # 情報設定終了

    viewer_protocol_policy = "redirect-to-https"             # 全てのアクセスを安全なHTTPSに変えさせます
    default_ttl            = 3600                           # 1時間は一度見た内容を再利用して高速化します
  }                                                          # 通常ルール終了

  ordered_cache_behavior {                                   # API用の特別な通信ルールを書きます
    path_pattern     = "/auth/*"                             # 「/auth/」で始まる通信が来たら
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"] # 全ての種類を許可します
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "EC2-${aws_instance.app.id}"          # この通信はサーバー（EC2）に直接繋げます

    forwarded_values {                                       # 伝える情報を決めます
      query_string = true                                    # 検索ワードなども伝えます
      headers      = ["Authorization", "Content-Type", "Origin", "Host"] # 誰からの通信か分かる身分証などを渡します

      cookies {                                              # クッキーです
        forward = "all"                                      # クッキーも全て伝えます
      }                                                      # クッキー設定終了
    }                                                        # 情報設定終了

    viewer_protocol_policy = "redirect-to-https"             # HTTPS通信にします
    min_ttl                = 0                               # キャッシュは全くしません
    default_ttl            = 0                               # 常に最新の情報をサーバーに聞きに行きます
    max_ttl                = 0
  }                                                          # APIルール1終了

  ordered_cache_behavior {                                   # TODOデータ用のルールです
    path_pattern     = "/todos/*"                            # 「/todos/」で始まる通信です
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "EC2-${aws_instance.app.id}"          # サーバーに繋げます

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
  }                                                          # ルール2終了

  ordered_cache_behavior {                                   # AI機能用のルールです
    path_pattern     = "/ai/*"                               # 「/ai/」で始まる通信です
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "EC2-${aws_instance.app.id}"          # サーバーに繋げます

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
  }                                                          # ルール3終了

  custom_error_response {                                    # ページが見つからなかった時の特別対応です
    error_code            = 403                             # 403エラーが起きたら
    response_code         = 200                             # 「成功したよ」という顔をして
    response_page_path    = "/index.html"                   # 代わりに index.html ファイルを表示します
  }                                                          # 403対応終了

  custom_error_response {                                    # もう一つのエラー対応です
    error_code            = 404                             # 404エラーが起きたら
    response_code         = 200                             # 成功したことにして
    response_page_path    = "/index.html"                   # index.html を見せます
  }                                                          # 404対応終了

  restrictions {                                             # アクセス制限です
    geo_restriction {                                        # 地域制限の設定です
      restriction_type = "none"                             # 特に制限はしません
    }                                                        # 終了
  }                                                          # 終了

  viewer_certificate {                                       # HTTPSで使う証明書の設定です
    cloudfront_default_certificate = true                   # CloudFront標準の証明書を使います
  }                                                          # 証明書設定終了

  tags = {                                                   # タグを付けます
    Name = "${var.project_name}-cloudfront"                 # 名前タグです
  }                                                          # タグ終了
}                                                           # 司令塔の設定終了
