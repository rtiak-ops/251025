# --------------------------------------------------------------------------------------------------
# GitHub Actions 用の IAM 設定
# --------------------------------------------------------------------------------------------------
# このファイルでは、GitHub Actions が AWS リソース（S3やCloudFront）を操作するための権限を設定します。
# 「アクセスキー」を発行せず、より安全な「OIDC (OpenID Connect)」という仕組みを利用します。

# 1. GitHub の認証サーバーを AWS に信頼させる設定
# GitHub Actions が発行するトークンを AWS が検証できるようにするためのプロバイダー情報です。
data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

# 2. GitHub Actions が一時的に「なりきる」ための IAM ロール
# 直接ユーザーを作るのではなく、「この条件を満たすGitHubリポジトリなら使って良いよ」という役割（ロール）を作ります。
resource "aws_iam_role" "github_actions" {
  name = "${var.project_name}-github-actions-role"

  # 信頼ポリシー（誰がこのロールを使えるか）の設定
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # OIDC経由での認証（Web Identity）を許可する
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          # 上で定義した GitHub プロバイダーを指定
          Federated = data.aws_iam_openid_connect_provider.github.arn
        }
        # 【重要】セキュリティの要
        # 特定のリポジトリ（今回の場合は rtiak-ops/251025）からのみ許可するように制限します。
        # これがないと、全世界のGitHubユーザーがあなたのAWSを操作できてしまいます。
        Condition = {
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:rtiak-ops/251025:*"
          }
        }
      }
    ]
  })
}

# 3. IAM ロールに付与する具体的な権限（ポリシー）
# 「GitHub Actions に何をして良いか」を定義します。
resource "aws_iam_role_policy" "github_actions_policy" {
  name = "${var.project_name}-github-actions-policy"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # S3へのアップロード、削除、リスト表示などを許可（フロントエンドのデプロイ用）
        # CloudFront のキャッシュクリア（Invalidation）を許可
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:DeleteObject",
          "cloudfront:CreateInvalidation"
        ]
        Effect   = "Allow"
        # 本番環境ではさらに Resource を特定の S3 バケットの ARN に絞るのがベストプラクティスです。
        Resource = "*" 
      }
    ]
  })
}

# 4. 作成したロールの ARN（識別子）を出力
# GitHub Actions のワークフローファイル（YAML）でこの値を使用します。
output "github_actions_role_arn" {
  value = aws_iam_role.github_actions.arn
}
