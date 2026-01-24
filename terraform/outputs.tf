# ==================================================================================================
# 7. 実行結果の出力 (Outputs)
# ==================================================================================================
# Terraformによる構築が終わった後、画面に表示したい情報を設定します。
# ここに表示される情報を、ブラウザに入力したり設定に使ったりします。

# ① サーバー（EC2）の住所：SSH接続などで使います
output "ec2_public_ip" {                        # サーバーの公開IPアドレスを出力します
  description = "Public IP of the EC2 instance" # 説明書きです
  value       = aws_eip.app.public_ip           # 固定されたIPアドレスを渡します
}                                               # 出力設定終了

# ② データベース（RDS）の接続先：アプリの設定で使います
output "rds_endpoint" {                        # データベースへの接続窓口（エンドポイント）を出力します
  description = "Endpoint of the RDS instance" # 説明書きです
  value       = aws_db_instance.main.endpoint  # 実際に作成されたDBの住所を渡します
}                                              # 出力設定終了

# ③ あなたのWebサイトのURL：これをブラウザで開くとアプリが見れます！
output "cloudfront_domain_name" {                            # サイトの公開URL（ドメイン名）を出力します
  description = "Domain name of the CloudFront distribution" # 説明書きです
  value       = aws_cloudfront_distribution.main.domain_name # CloudFrontが発行したURLを渡します
}                                                            # 出力設定終了

# ④ フロントエンドのファイル置き場（S3バケット）の名前
output "s3_bucket_name" {                            # フロントエンドのファイルを置く箱（バケット）の名を出力します
  description = "Name of the S3 bucket for frontend" # 説明書きです
  value       = aws_s3_bucket.frontend.id            # バケットの名前を渡します
}                                                    # 出力設定終了

# ⑤ 配信ネットワーク（CloudFront）のID：キャッシュクリアの際に指定します
output "cloudfront_distribution_id" {               # 配信システムの管理IDを出力します
  description = "Distribution ID of the CloudFront" # 説明書きです
  value       = aws_cloudfront_distribution.main.id # 配信システムのIDを渡します
}                                                   # 出力設定終了

