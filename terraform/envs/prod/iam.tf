# ==========================================
# 権限管理 (IAM) 設定
# ==========================================

# ------------------------------------------
# 1. GitHub Actions 連携用の認証設定 (OIDC)
# ------------------------------------------

# GitHub Actions と AWS をセキュアに連携するための OIDC プロバイダー情報を取得
# ※ 既に作成済みのプロバイダーを参照します。
data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

# GitHub Actions がデプロイ時に一時的に使用する IAM ロール
# アクセスキーを発行せずに、GitHub の ID トークンを用いて AWS 操作を許可します。
resource "aws_iam_role" "github_actions" {
  name = "${var.project_name}-github-actions-role"

  # 信頼関係 (Trust Relationship)
  # どのエンティティ（ここでは GitHub Actions）にこのロールの使用を許可するかを定義
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = data.aws_iam_openid_connect_provider.github.arn
        }
        # セキュリティ制約: 特定のGitHubリポジトリ（およびそのブランチ/タグ）のみに限定
        Condition = {
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:rtiak-ops/251025:*"
          }
        }
      }
    ]
  })
}

# GitHub Actions 用の権限ポリシー (インラインポリシー)
# デプロイ（フロントエンド、バックエンド、DBマイグレーション等）に必要な最小限の権限
resource "aws_iam_role_policy" "github_actions_policy" {
  name = "${var.project_name}-github-actions-policy"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          # フロントエンドデプロイ用 (S3, CloudFront)
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:DeleteObject",
          "cloudfront:CreateInvalidation",
          "cloudfront:ListDistributions",
          "cloudfront:GetDistribution",
          # バックエンドデプロイ用 (EC2 へのコマンド送信)
          "ec2:DescribeInstances",
          "ssm:SendCommand",
          "ssm:GetCommandInvocation",
          # インフラ情報取得用
          "rds:DescribeDBInstances",
          "resourcegroupstaggingapi:GetResources"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}

# ------------------------------------------
# 2. EC2 インスタンス用の権限設定 (SSM)
# ------------------------------------------

# EC2 インスタンス自体に付与する IAM ロール
# AWS サービス（SSM 等）とのやり取りを許可するために必要です。
resource "aws_iam_role" "ec2_ssm_role" {
  name = "${var.project_name}-ec2-ssm-role"

  # EC2 サービスにこのロールの引き受けを許可
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

# AWS 管理ポリシーのアタッチ
# AmazonSSMManagedInstanceCore: SSM (Session Manager) 経由でのログインや操作に必須の権限
resource "aws_iam_role_policy_attachment" "ssm_managed_core" {
  role       = aws_iam_role.ec2_ssm_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# 実際の EC2 インスタンスに適用するための「インスタンスプロフィール」
resource "aws_iam_instance_profile" "ec2_ssm_profile" {
  name = "${var.project_name}-ec2-ssm-profile"
  role = aws_iam_role.ec2_ssm_role.name
}

# GitHub Actions用ロールのARN出力
output "github_actions_role_arn" {
  value       = aws_iam_role.github_actions.arn
  description = "ARN of the IAM role for GitHub Actions"
}

