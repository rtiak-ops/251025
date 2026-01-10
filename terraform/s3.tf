# ==================================================================================================
# 5. ファイル置き場 (S3)
# ==================================================================================================

resource "aws_s3_bucket" "frontend" {        # フロントエンドのファイルを置くバケツを作ります
  bucket = "${var.project_name}-frontend-${data.aws_caller_identity.current.account_id}" # 世界で一つの名前を付けます
  force_destroy = true                      # 中身が入っていてもバケツを捨てられるようにします

  tags = {                                   # タグを付けます
    Name = "${var.project_name}-frontend-bucket" # 名前タグです
  }                                          # タグ設定終了
}                                           # バケツ設定終了

resource "aws_s3_bucket_public_access_block" "frontend" { # バケツに蓋をして勝手に見られないようにします
  bucket = aws_s3_bucket.frontend.id        # さっき作ったバケツに蓋をします

  block_public_acls       = true            # 名簿（ACL）による公開を禁止します
  block_public_policy     = true            # 書類（ポリシー）による公開を禁止します
  ignore_public_acls      = true            # 全ての名簿設定を無視します
  restrict_public_buckets = true            # とにかくバケツを秘密にします
}                                           # 公開制限設定終了

resource "aws_s3_bucket_policy" "frontend" { # 「特定の相手だけ見ていいよ」という許可証を貼ります
  bucket = aws_s3_bucket.frontend.id        # バケツに許可証を貼ります
  policy = data.aws_iam_policy_document.s3_policy.json # 下で書く許可証の内容を使います
}                                           # 許可証（ポリシー）設定終了

data "aws_iam_policy_document" "s3_policy" { # 許可証の内容を書きます
  statement {                                # 許可ルール1つ目を書きます
    actions   = ["s3:GetObject"]             # 「ファイルの中身を見る」ことを許可します
    resources = ["${aws_s3_bucket.frontend.arn}/*"] # このバケツの中にある全てのファイルが対象です

    principals {                             # 見てもいい相手を指定します
      type        = "Service"                # AWSの「サービス」を対象にします
      identifiers = ["cloudfront.amazonaws.com"] # 配信サービスの「CloudFront」にだけ見せます
    }                                        # 相手指定終了

    condition {                              # さらに厳しい条件を付けます
      test     = "StringEquals"              # 次の値が完全に一致した時だけOKにします
      variable = "AWS:SourceArn"             # 「どこから来たか」をチェックします
      values   = [aws_cloudfront_distribution.main.arn] # このプロジェクトのCloudFrontから来た時だけに絞ります
    }                                        # 条件設定終了
  }                                          # ルール設定終了
}                                           # 許可証の内容作成終了

data "aws_caller_identity" "current" {}      # あなたのAWSアカウントIDを自動で取ってきます
