# ==================================================================================================
# 7. 権限管理 (IAM)
# ==================================================================================================
# 「誰が」「何に対して」「何をして良いか」という許可証（ルール）を作ります。
# ここでは、自動デプロイツール（GitHub Actions）がAWSを操作するための設定をしています。

# --------------------------------------------------------------------------------------------------
# ① 信頼の設定 (OIDC Provider)
# --------------------------------------------------------------------------------------------------
# 「GitHubというサービスを信頼しますよ」という登録をAWS側で行います。
data "aws_iam_openid_connect_provider" "github" {  # GitHubとAWSを繋ぐための「認証窓口」の情報を取得します
  url = "https://token.actions.githubusercontent.com" # GitHubが発行するデプロイ用チケットの発行元URLです
}                                               # 情報取得終了

# --------------------------------------------------------------------------------------------------
# ② 役割 (IAM Role)：GitHub Actions用の「仮の姿」
# --------------------------------------------------------------------------------------------------
# 直接ユーザーを作るのではなく、「この条件を満たすGitHubリポジトリなら、一時的にこの役割に変身して良いよ」という枠組みを作ります。
resource "aws_iam_role" "github_actions" {       # GitHubデプロイ専用の「役割（ロール）」を作ります
  name = "${var.project_name}-github-actions-role" # 役割に名前を付けます

  # 「変身を許可する」ための書類（Assume Role Policy）
  assume_role_policy = jsonencode({              # 誰がこの役割になって良いか、ルールを書きます
    Version = "2012-10-17"                      # AWSのポリシーを書く時の標準的な日付（形式）です
    Statement = [                               # ルールの内容をリストで書きます
      {                                         # 1つ目のルールです
        Action = "sts:AssumeRoleWithWebIdentity" # 「Web認証を使って役割に変身する」ことを許可します
        Effect = "Allow"                        # 「許可」します
        Principal = {                           # 変身を許可する相手を指定します
          Federated = data.aws_iam_openid_connect_provider.github.arn # さっきのGitHub認証窓口からの依頼を受け付けます
        }                                       # 相手指定終了
        # 【重要】セキュリティの要
        # 「自分の特定のリポジトリ（rtiak-ops/251025）から来た時だけ」という厳しい条件を付けます。
        Condition = {                            # さらに詳しい条件を付けます
          StringLike = {                        # 下の値が一致しているかチェックします
            "token.actions.githubusercontent.com:sub" = "repo:rtiak-ops/251025:*" # 特定のリポジトリ（rtiak-ops/251025）からのアクセスだけに絞ります
          }                                     # チェック内容終了
        }                                       # 条件設定終了
      }                                         # ルール終了
    ]                                           # リスト終了
  })                                            # ポリシー記述終了
}                                               # 役割設定終了

# --------------------------------------------------------------------------------------------------
# ③ 許可証 (IAM Policy)：具体的に何ができるか？
# --------------------------------------------------------------------------------------------------
# 役割（IAMロール）に対して、「具体的にどのボタンを押して良いか」を決めます。
resource "aws_iam_role_policy" "github_actions_policy" { # 具体的に「何をして良いか」という許可証を作ります
  name = "${var.project_name}-github-actions-policy" # 許可証に名前を付けます
  role = aws_iam_role.github_actions.id          # 上で作った「役割」にこの許可証を渡します

  policy = jsonencode({                          # 許可する具体的なアクションを書きます
    Version = "2012-10-17"                      # 標準的な形式です
    Statement = [                               # ルールリストです
      {                                         # 許可ルールの詳細です
        # S3へのファイル配置、インフラ情報の取得、キャッシュ削除などを許可します。
        Action = [                              # 許可する「ボタン（操作）」のリストです
          "s3:PutObject",                       # S3にファイルをアップロードする
          "s3:GetObject",                       # S3からファイルを取得する
          "s3:ListBucket",                      # S3のファイル一覧を見る
          "s3:DeleteObject",                    # S3の古いファイルを消す
          "cloudfront:CreateInvalidation",      # CloudFrontのキャッシュをクリアする
          "cloudfront:ListDistributions",       # CloudFrontの一覧を取得する
          "cloudfront:GetDistribution",        # CloudFrontの詳細設定を取得する
          "ec2:DescribeInstances",              # EC2サーバーの情報を取得する
          "rds:DescribeDBInstances",            # データベースの情報を取得する
          "resourcegroupstaggingapi:GetResources" # タグを使ってリソースを探す
        ]                                       # 操作リスト終了
        Effect   = "Allow"                      # これらを「許可」します
        Resource = "*"                          # 全てのリソースを対象にします
      }                                         # ルール終了
    ]                                           # リスト終了
  })                                            # ポリシー記述終了
}                                               # 許可証設定終了

# --------------------------------------------------------------------------------------------------
# ⑤ EC2用IAMロール (SSM経由のログイン用)
# --------------------------------------------------------------------------------------------------
# サーバー（EC2）がAWSの他のサービス（SSMなど）と安全に通信するための設定です。
resource "aws_iam_role" "ec2_ssm_role" {
  name = "${var.project_name}-ec2-ssm-role"

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

# SSMを利用するための標準的な許可証をロールに貼り付けます
resource "aws_iam_role_policy_attachment" "ssm_managed_core" {
  role       = aws_iam_role.ec2_ssm_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# インスタンスプロフィール（EC2にロールを渡すための入れ物）を作成します
resource "aws_iam_instance_profile" "ec2_ssm_profile" {
  name = "${var.project_name}-ec2-ssm-profile"
  role = aws_iam_role.ec2_ssm_role.name
}

# --------------------------------------------------------------------------------------------------
# ④ 結果の出力 (Output)
# --------------------------------------------------------------------------------------------------
# 作成した「役割の名前（ARN）」を後で使えるように表示します。
# これを GitHub のシークレットに設定することで、連携ができるようになります。
output "github_actions_role_arn" {               # 作成した役割の「正式名称（ARN）」を出力します
  value = aws_iam_role.github_actions.arn        # 役割のARNを画面に表示します
}                                               # 出力設定終了

