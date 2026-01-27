# ==========================================
# 自動停止・起動スケジューラー (EventBridge)
# ==========================================

# ------------------------------------------
# 1. 夜間の自動停止スケジュール
# ------------------------------------------

# 毎日 18:00 (JST) にイベントを発生させるルール
# ※ コスト削減のため、業務時間外にインスタンスを停止します。
resource "aws_cloudwatch_event_rule" "stop_daily" {
  name                = "${var.project_name}-stop-daily"
  description         = "毎日18:00にインスタンスを停止"
  schedule_expression = "cron(0 9 * * ? *)" # UTC 9:00 = JST 18:00
  
  tags = {
    Name = "${var.project_name}-stop-daily"
  }
}

# イベントのターゲットとして Lambda 関数を指定
resource "aws_cloudwatch_event_target" "stop_daily" {
  rule      = aws_cloudwatch_event_rule.stop_daily.name
  target_id = "StopInstances"
  arn       = aws_lambda_function.stop_instances.arn
}

# EventBridge から Lambda を起動するための権限許可
resource "aws_lambda_permission" "allow_eventbridge_stop_daily" {
  statement_id  = "AllowExecutionFromEventBridgeDailyStop"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.stop_instances.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.stop_daily.arn
}

# ------------------------------------------
# 2. 昼前の自動起動スケジュール
# ------------------------------------------

# 毎日 12:00 (JST) にイベントを発生させるルール
resource "aws_cloudwatch_event_rule" "start_daily" {
  name                = "${var.project_name}-start-daily"
  description         = "毎日12:00にインスタンスを起動"
  schedule_expression = "cron(0 3 * * ? *)" # UTC 3:00 = JST 12:00

  tags = {
    Name = "${var.project_name}-start-daily"
  }
}

# イベントのターゲットとして Lambda 関数を指定
resource "aws_cloudwatch_event_target" "start_daily" {
  rule      = aws_cloudwatch_event_rule.start_daily.name
  target_id = "StartInstances"
  arn       = aws_lambda_function.start_instances.arn
}

# EventBridge から Lambda を起動するための権限許可
resource "aws_lambda_permission" "allow_eventbridge_start_daily" {
  statement_id  = "AllowExecutionFromEventBridgeDailyStart"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.start_instances.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.start_daily.arn
}


