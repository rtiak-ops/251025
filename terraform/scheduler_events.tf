# ==================================================================================================
# 自動停止・起動スケジューラー: EventBridgeスケジュール設定
# ==================================================================================================

# ■ 毎日18:00に停止するスケジュール
resource "aws_cloudwatch_event_rule" "stop_daily" {
  name                = "${var.project_name}-stop-daily"
  description         = "毎日18:00にインスタンスを停止"
  schedule_expression = "cron(0 9 * * ? *)" # JST 18:00 (UTC 9:00)

  tags = {
    Name = "${var.project_name}-stop-daily"
  }
}

resource "aws_cloudwatch_event_target" "stop_daily" {
  rule      = aws_cloudwatch_event_rule.stop_daily.name
  target_id = "StopInstances"
  arn       = aws_lambda_function.stop_instances.arn
}

resource "aws_lambda_permission" "allow_eventbridge_stop_daily" {
  statement_id  = "AllowExecutionFromEventBridgeDailyStop"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.stop_instances.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.stop_daily.arn
}

# ■ 毎日12:00に起動するスケジュール
resource "aws_cloudwatch_event_rule" "start_daily" {
  name                = "${var.project_name}-start-daily"
  description         = "毎日12:00にインスタンスを起動"
  schedule_expression = "cron(0 3 * * ? *)" # JST 12:00 (UTC 3:00)

  tags = {
    Name = "${var.project_name}-start-daily"
  }
}

resource "aws_cloudwatch_event_target" "start_daily" {
  rule      = aws_cloudwatch_event_rule.start_daily.name
  target_id = "StartInstances"
  arn       = aws_lambda_function.start_instances.arn
}

resource "aws_lambda_permission" "allow_eventbridge_start_daily" {
  statement_id  = "AllowExecutionFromEventBridgeDailyStart"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.start_instances.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.start_daily.arn
}

