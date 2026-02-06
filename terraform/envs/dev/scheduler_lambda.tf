# ==========================================
# 自動停止・起動スケジューラー (Lambda)
# ==========================================

# ------------------------------------------
# 1. Lambda 実行用の権限 (IAM ロール)
# ------------------------------------------

resource "aws_iam_role" "scheduler_lambda" {
  name = "${var.project_name}-scheduler-lambda-role"

  # Lambda サービスがこのロールを使用することを許可
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })

  tags = {
    Name = "${var.project_name}-scheduler-lambda-role"
  }
}

# 操作に必要な最小限のポリシーを定義
resource "aws_iam_role_policy" "scheduler_lambda_policy" {
  name = "${var.project_name}-scheduler-lambda-policy"
  role = aws_iam_role.scheduler_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # EC2 と RDS の起動・停止・状態確認を許可
        Effect = "Allow"
        Action = [
          "ec2:DescribeInstances",
          "ec2:StartInstances",
          "ec2:StopInstances",
          "rds:DescribeDBInstances",
          "rds:StartDBInstance",
          "rds:StopDBInstance"
        ]
        Resource = "*"
      },
      {
        # CloudWatch Logs へのログ出力を許可
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# ------------------------------------------
# 2. 停止・起動を実行する Lambda 本体
# ------------------------------------------

# インスタンス停止用
resource "aws_lambda_function" "stop_instances" {
  filename      = data.archive_file.lambda_stop.output_path
  function_name = "${var.project_name}-stop-instances"
  role          = aws_iam_role.scheduler_lambda.arn
  handler       = "index.handler"
  runtime       = "python3.13"
  timeout       = 60

  source_code_hash = data.archive_file.lambda_stop.output_base64sha256

  # どのインスタンスを操作するかを環境変数で渡す
  environment {
    variables = {
      EC2_INSTANCE_ID = aws_instance.app.id
      RDS_INSTANCE_ID = aws_db_instance.main.identifier
    }
  }

  tags = {
    Name = "${var.project_name}-stop-instances"
  }
}

# インスタンス起動用
resource "aws_lambda_function" "start_instances" {
  filename      = data.archive_file.lambda_start.output_path
  function_name = "${var.project_name}-start-instances"
  role          = aws_iam_role.scheduler_lambda.arn
  handler       = "index.handler"
  runtime       = "python3.13"
  timeout       = 60

  source_code_hash = data.archive_file.lambda_start.output_base64sha256

  environment {
    variables = {
      EC2_INSTANCE_ID = aws_instance.app.id
      RDS_INSTANCE_ID = aws_db_instance.main.identifier
    }
  }

  tags = {
    Name = "${var.project_name}-start-instances"
  }
}

# ------------------------------------------
# 3. ソースコードのアーカイブ定義
# ------------------------------------------

data "archive_file" "lambda_stop" {
  type        = "zip"
  output_path = "${path.module}/../../lambda_stop.zip"
  source_dir  = "${path.module}/../../lambda/stop"
}

data "archive_file" "lambda_start" {
  type        = "zip"
  output_path = "${path.module}/../../lambda_start.zip"
  source_dir  = "${path.module}/../../lambda/start"
}
