# ==================================================================================================
# 自動停止・起動スケジューラー: Lambda定義
# ==================================================================================================

# --------------------------------------------------------------------------------------------------
# ① Lambda用のIAMロール（権限）
# --------------------------------------------------------------------------------------------------
resource "aws_iam_role" "scheduler_lambda" {
  name = "${var.project_name}-scheduler-lambda-role"

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

resource "aws_iam_role_policy" "scheduler_lambda_policy" {
  name = "${var.project_name}-scheduler-lambda-policy"
  role = aws_iam_role.scheduler_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
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

# --------------------------------------------------------------------------------------------------
# ② Lambda関数（停止用）
# --------------------------------------------------------------------------------------------------
resource "aws_lambda_function" "stop_instances" {
  filename      = data.archive_file.lambda_stop.output_path
  function_name = "${var.project_name}-stop-instances"
  role          = aws_iam_role.scheduler_lambda.arn
  handler       = "index.handler"
  runtime       = "python3.13"
  timeout       = 60

  source_code_hash = data.archive_file.lambda_stop.output_base64sha256

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

data "archive_file" "lambda_stop" {
  type        = "zip"
  output_path = "${path.module}/lambda_stop.zip"
  source_dir  = "${path.module}/lambda/stop"
}

# --------------------------------------------------------------------------------------------------
# ③ Lambda関数（起動用）
# --------------------------------------------------------------------------------------------------
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

data "archive_file" "lambda_start" {
  type        = "zip"
  output_path = "${path.module}/lambda_start.zip"
  source_dir  = "${path.module}/lambda/start"
}
