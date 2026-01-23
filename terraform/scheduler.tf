# ==================================================================================================
# 7. 自動停止・起動スケジューラー (Lambda + EventBridge)
# ==================================================================================================
# 【目的】コスト削減のため、使わない時間帯にEC2とRDSを自動停止します
# 【効果】約60%のコスト削減が見込めます
# 【スケジュール】
#   - 平日：13:00起動 → 18:00停止（業務時間外は停止）
#   - 土日：金曜18:00に停止 → 月曜13:00に起動（週末は完全停止）

# --------------------------------------------------------------------------------------------------
# ① Lambda用のIAMロール（権限）
# --------------------------------------------------------------------------------------------------
# Lambda関数がAWSサービスを操作するために必要な「身分証明書」を作ります
resource "aws_iam_role" "scheduler_lambda" {
  name = "${var.project_name}-scheduler-lambda-role"

  # このロールをLambdaサービスが使えるようにする設定（信頼ポリシー）
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"              # Lambdaがこのロールを引き受けることを許可
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"     # Lambda サービスだけが使える
      }
    }]
  })

  tags = {
    Name = "${var.project_name}-scheduler-lambda-role"
  }
}

# Lambda関数がEC2とRDSを操作できるようにする権限ポリシー
resource "aws_iam_role_policy" "scheduler_lambda_policy" {
  name = "${var.project_name}-scheduler-lambda-policy"
  role = aws_iam_role.scheduler_lambda.id   # 上で作ったロールに権限を追加

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:DescribeInstances",           # EC2インスタンスの情報を見る権限
          "ec2:StartInstances",              # EC2を起動する権限
          "ec2:StopInstances",               # EC2を停止する権限
          "rds:DescribeDBInstances",         # RDSインスタンスの情報を見る権限
          "rds:StartDBInstance",             # RDSを起動する権限
          "rds:StopDBInstance"               # RDSを停止する権限
        ]
        Resource = "*"                       # 全てのEC2/RDSに対して操作可能
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",             # ログを記録するグループを作る権限
          "logs:CreateLogStream",            # ログを書き込むストリームを作る権限
          "logs:PutLogEvents"                # 実際にログを書き込む権限
        ]
        Resource = "arn:aws:logs:*:*:*"      # CloudWatch Logsへのアクセス許可
      }
    ]
  })
}

# --------------------------------------------------------------------------------------------------
# ② Lambda関数（停止用）
# --------------------------------------------------------------------------------------------------
# EC2とRDSを停止するためのLambda関数を作成します
resource "aws_lambda_function" "stop_instances" {
  filename      = "${path.module}/lambda_stop.zip"              # 実行するコードのZIPファイル
  function_name = "${var.project_name}-stop-instances"          # Lambda関数の名前
  role          = aws_iam_role.scheduler_lambda.arn             # 使用するIAMロール（権限）
  handler       = "index.handler"                               # 実行する関数の場所（index.pyのhandler関数）
  runtime       = "python3.13"                                  # Python 3.13で動かします
  timeout       = 60                                            # 最大60秒まで実行を許可

  source_code_hash = data.archive_file.lambda_stop.output_base64sha256  # コードが変更されたら自動で再デプロイ

  # Lambda関数に渡す環境変数（設定情報）
  environment {
    variables = {
      EC2_INSTANCE_ID = aws_instance.app.id                     # 停止するEC2のID
      RDS_INSTANCE_ID = aws_db_instance.main.identifier         # 停止するRDSのID
    }
  }

  tags = {
    Name = "${var.project_name}-stop-instances"
  }
}

# Lambda関数のPythonコードをZIPファイルにパッケージ化します
data "archive_file" "lambda_stop" {
  type        = "zip"                                           # ZIP形式で圧縮
  output_path = "${path.module}/lambda_stop.zip"                # 出力先のファイル名

  source {
    # 以下がLambda関数の実際のPythonコードです
    content  = <<-EOF
import boto3  # AWSのサービスを操作するライブラリ
import os     # 環境変数を読み取るライブラリ

# AWSのEC2とRDSを操作するクライアントを作成
ec2 = boto3.client('ec2')
rds = boto3.client('rds')

# Lambda関数のメイン処理（EventBridgeから呼び出されます）
def handler(event, context):
    # 環境変数から停止対象のインスタンスIDを取得
    ec2_instance_id = os.environ['EC2_INSTANCE_ID']
    rds_instance_id = os.environ['RDS_INSTANCE_ID']
    
    # EC2インスタンスを停止
    try:
        ec2.stop_instances(InstanceIds=[ec2_instance_id])
        print(f'EC2インスタンス {ec2_instance_id} を停止しました')
    except Exception as e:
        print(f'EC2停止エラー: {e}')  # エラーが出てもRDS停止は続行
    
    # RDSインスタンスを停止
    try:
        rds.stop_db_instance(DBInstanceIdentifier=rds_instance_id)
        print(f'RDSインスタンス {rds_instance_id} を停止しました')
    except Exception as e:
        print(f'RDS停止エラー: {e}')
    
    # 処理結果を返す
    return {
        'statusCode': 200,
        'body': 'インスタンスを停止しました'
    }
EOF
    filename = "index.py"  # ZIPファイル内でのファイル名
  }
}

# --------------------------------------------------------------------------------------------------
# ③ Lambda関数（起動用）
# --------------------------------------------------------------------------------------------------
# EC2とRDSを起動するためのLambda関数を作成します
resource "aws_lambda_function" "start_instances" {
  filename      = "${path.module}/lambda_start.zip"             # 実行するコードのZIPファイル
  function_name = "${var.project_name}-start-instances"         # Lambda関数の名前
  role          = aws_iam_role.scheduler_lambda.arn             # 使用するIAMロール（権限）
  handler       = "index.handler"                               # 実行する関数の場所
  runtime       = "python3.13"                                  # Python 3.13で動かします
  timeout       = 60                                            # 最大60秒まで実行を許可

  source_code_hash = data.archive_file.lambda_start.output_base64sha256  # コードが変更されたら自動で再デプロイ

  # Lambda関数に渡す環境変数（設定情報）
  environment {
    variables = {
      EC2_INSTANCE_ID = aws_instance.app.id                     # 起動するEC2のID
      RDS_INSTANCE_ID = aws_db_instance.main.identifier         # 起動するRDSのID
    }
  }

  tags = {
    Name = "${var.project_name}-start-instances"
  }
}

# Lambda関数のPythonコードをZIPファイルにパッケージ化します
data "archive_file" "lambda_start" {
  type        = "zip"                                           # ZIP形式で圧縮
  output_path = "${path.module}/lambda_start.zip"               # 出力先のファイル名

  source {
    # 以下がLambda関数の実際のPythonコードです
    content  = <<-EOF
import boto3  # AWSのサービスを操作するライブラリ
import os     # 環境変数を読み取るライブラリ

# AWSのEC2とRDSを操作するクライアントを作成
ec2 = boto3.client('ec2')
rds = boto3.client('rds')

# Lambda関数のメイン処理（EventBridgeから呼び出されます）
def handler(event, context):
    # 環境変数から起動対象のインスタンスIDを取得
    ec2_instance_id = os.environ['EC2_INSTANCE_ID']
    rds_instance_id = os.environ['RDS_INSTANCE_ID']
    
    # RDSを先に起動（データベースの準備に時間がかかるため）
    try:
        rds.start_db_instance(DBInstanceIdentifier=rds_instance_id)
        print(f'RDSインスタンス {rds_instance_id} を起動しました')
    except Exception as e:
        print(f'RDS起動エラー: {e}')  # エラーが出てもEC2起動は続行
    
    # EC2インスタンスを起動
    try:
        ec2.start_instances(InstanceIds=[ec2_instance_id])
        print(f'EC2インスタンス {ec2_instance_id} を起動しました')
    except Exception as e:
        print(f'EC2起動エラー: {e}')
    
    # 処理結果を返す
    return {
        'statusCode': 200,
        'body': 'インスタンスを起動しました'
    }
EOF
    filename = "index.py"  # ZIPファイル内でのファイル名
  }
}

# --------------------------------------------------------------------------------------------------
# ④ EventBridgeルール（スケジュール設定）
# --------------------------------------------------------------------------------------------------
# EventBridgeを使って、決まった時刻にLambda関数を自動実行します
# 【重要】AWSの時刻はUTC（協定世界時）なので、日本時間（JST）から-9時間した値を設定します

# ■ 平日18:00に停止するスケジュール
resource "aws_cloudwatch_event_rule" "stop_weekday_night" {
  name                = "${var.project_name}-stop-weekday-night"
  description         = "平日18:00にインスタンスを停止"
  # cron式の説明: 分 時 日 月 曜日 年
  # 0 9 ? * MON-FRI * = 毎週月〜金曜の09:00 UTC（= 18:00 JST）
  schedule_expression = "cron(0 9 ? * MON-FRI *)"  # UTC 09:00 = JST 18:00

  tags = {
    Name = "${var.project_name}-stop-weekday-night"
  }
}

# EventBridgeルールが実行するLambda関数を指定
resource "aws_cloudwatch_event_target" "stop_weekday_night" {
  rule      = aws_cloudwatch_event_rule.stop_weekday_night.name  # 上で作ったルール
  target_id = "StopInstances"                                    # ターゲットの識別名
  arn       = aws_lambda_function.stop_instances.arn             # 停止用Lambda関数を指定
}

# EventBridgeがLambda関数を実行できるように許可を与える
resource "aws_lambda_permission" "allow_eventbridge_stop_weekday" {
  statement_id  = "AllowExecutionFromEventBridgeWeekday"         # 許可の識別名
  action        = "lambda:InvokeFunction"                        # Lambda実行を許可
  function_name = aws_lambda_function.stop_instances.function_name
  principal     = "events.amazonaws.com"                         # EventBridgeサービスに許可
  source_arn    = aws_cloudwatch_event_rule.stop_weekday_night.arn  # このルールからのみ許可
}

# ■ 平日13:00に起動するスケジュール
resource "aws_cloudwatch_event_rule" "start_weekday_morning" {
  name                = "${var.project_name}-start-weekday-morning"
  description         = "平日13:00にインスタンスを起動"
  # cron式: 0 4 ? * MON-FRI * = 毎週月〜金曜の04:00 UTC（= 13:00 JST）
  schedule_expression = "cron(0 4 ? * MON-FRI *)"  # UTC 04:00 = JST 13:00

  tags = {
    Name = "${var.project_name}-start-weekday-morning"
  }
}

# EventBridgeルールが実行するLambda関数を指定
resource "aws_cloudwatch_event_target" "start_weekday_morning" {
  rule      = aws_cloudwatch_event_rule.start_weekday_morning.name  # 上で作ったルール
  target_id = "StartInstances"                                      # ターゲットの識別名
  arn       = aws_lambda_function.start_instances.arn               # 起動用Lambda関数を指定
}

# EventBridgeがLambda関数を実行できるように許可を与える
resource "aws_lambda_permission" "allow_eventbridge_start_weekday" {
  statement_id  = "AllowExecutionFromEventBridgeWeekdayMorning"     # 許可の識別名
  action        = "lambda:InvokeFunction"                           # Lambda実行を許可
  function_name = aws_lambda_function.start_instances.function_name
  principal     = "events.amazonaws.com"                            # EventBridgeサービスに許可
  source_arn    = aws_cloudwatch_event_rule.start_weekday_morning.arn  # このルールからのみ許可
}

# ■ 金曜18:00に停止するスケジュール（週末用）
resource "aws_cloudwatch_event_rule" "stop_weekend" {
  name                = "${var.project_name}-stop-weekend"
  description         = "金曜18:00にインスタンスを停止（土日用）"
  # cron式: 0 9 ? * FRI * = 毎週金曜の09:00 UTC（= 18:00 JST）
  # 注意：平日停止と重複していますが、冗長性のため両方設定しています
  schedule_expression = "cron(0 9 ? * FRI *)"  # UTC 09:00 金曜 = JST 18:00 金曜

  tags = {
    Name = "${var.project_name}-stop-weekend"
  }
}

# EventBridgeルールが実行するLambda関数を指定
resource "aws_cloudwatch_event_target" "stop_weekend" {
  rule      = aws_cloudwatch_event_rule.stop_weekend.name  # 上で作ったルール
  target_id = "StopInstancesWeekend"                       # ターゲットの識別名
  arn       = aws_lambda_function.stop_instances.arn       # 停止用Lambda関数を指定
}

# EventBridgeがLambda関数を実行できるように許可を与える
resource "aws_lambda_permission" "allow_eventbridge_stop_weekend" {
  statement_id  = "AllowExecutionFromEventBridgeWeekend"   # 許可の識別名
  action        = "lambda:InvokeFunction"                  # Lambda実行を許可
  function_name = aws_lambda_function.stop_instances.function_name
  principal     = "events.amazonaws.com"                   # EventBridgeサービスに許可
  source_arn    = aws_cloudwatch_event_rule.stop_weekend.arn  # このルールからのみ許可
}

# ■ 月曜13:00に起動するスケジュール（週末明け）
resource "aws_cloudwatch_event_rule" "start_monday_morning" {
  name                = "${var.project_name}-start-monday-morning"
  description         = "月曜13:00にインスタンスを起動"
  # cron式: 0 4 ? * MON * = 毎週月曜の04:00 UTC（= 13:00 JST）
  # 注意：平日起動と重複していますが、冗長性のため両方設定しています
  schedule_expression = "cron(0 4 ? * MON *)"  # UTC 04:00 月曜 = JST 13:00 月曜

  tags = {
    Name = "${var.project_name}-start-monday-morning"
  }
}

# EventBridgeルールが実行するLambda関数を指定
resource "aws_cloudwatch_event_target" "start_monday_morning" {
  rule      = aws_cloudwatch_event_rule.start_monday_morning.name  # 上で作ったルール
  target_id = "StartInstancesMonday"                               # ターゲットの識別名
  arn       = aws_lambda_function.start_instances.arn              # 起動用Lambda関数を指定
}

# EventBridgeがLambda関数を実行できるように許可を与える
resource "aws_lambda_permission" "allow_eventbridge_start_monday" {
  statement_id  = "AllowExecutionFromEventBridgeMonday"            # 許可の識別名
  action        = "lambda:InvokeFunction"                          # Lambda実行を許可
  function_name = aws_lambda_function.start_instances.function_name
  principal     = "events.amazonaws.com"                           # EventBridgeサービスに許可
  source_arn    = aws_cloudwatch_event_rule.start_monday_morning.arn  # このルールからのみ許可
}
