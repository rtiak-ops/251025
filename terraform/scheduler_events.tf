# ==================================================================================================
# 自動停止・起動スケジューラー: EventBridgeスケジュール設定
# ==================================================================================================

# ■ 平日18:00に停止するスケジュール
resource "aws_cloudwatch_event_rule" "stop_weekday_night" {
  name                = "${var.project_name}-stop-weekday-night"
  description         = "平日18:00にインスタンスを停止"
  schedule_expression = "cron(0 9 ? * MON-FRI *)" # JST 18:00

  tags = {
    Name = "${var.project_name}-stop-weekday-night"
  }
}

resource "aws_cloudwatch_event_target" "stop_weekday_night" {
  rule      = aws_cloudwatch_event_rule.stop_weekday_night.name
  target_id = "StopInstances"
  arn       = aws_lambda_function.stop_instances.arn
}

resource "aws_lambda_permission" "allow_eventbridge_stop_weekday" {
  statement_id  = "AllowExecutionFromEventBridgeWeekday"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.stop_instances.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.stop_weekday_night.arn
}

# ■ 平日13:00に起動するスケジュール
resource "aws_cloudwatch_event_rule" "start_weekday_morning" {
  name                = "${var.project_name}-start-weekday-morning"
  description         = "平日13:00にインスタンスを起動"
  schedule_expression = "cron(0 4 ? * MON-FRI *)" # JST 13:00

  tags = {
    Name = "${var.project_name}-start-weekday-morning"
  }
}

resource "aws_cloudwatch_event_target" "start_weekday_morning" {
  rule      = aws_cloudwatch_event_rule.start_weekday_morning.name
  target_id = "StartInstances"
  arn       = aws_lambda_function.start_instances.arn
}

resource "aws_lambda_permission" "allow_eventbridge_start_weekday" {
  statement_id  = "AllowExecutionFromEventBridgeWeekdayMorning"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.start_instances.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.start_weekday_morning.arn
}

# ■ 金曜18:00に停止するスケジュール（週末用）
resource "aws_cloudwatch_event_rule" "stop_weekend" {
  name                = "${var.project_name}-stop-weekend"
  description         = "金曜18:00にインスタンスを停止（土日用）"
  schedule_expression = "cron(0 9 ? * FRI *)"

  tags = {
    Name = "${var.project_name}-stop-weekend"
  }
}

resource "aws_cloudwatch_event_target" "stop_weekend" {
  rule      = aws_cloudwatch_event_rule.stop_weekend.name
  target_id = "StopInstancesWeekend"
  arn       = aws_lambda_function.stop_instances.arn
}

resource "aws_lambda_permission" "allow_eventbridge_stop_weekend" {
  statement_id  = "AllowExecutionFromEventBridgeWeekend"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.stop_instances.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.stop_weekend.arn
}

# ■ 月曜13:00に起動するスケジュール（週末明け）
resource "aws_cloudwatch_event_rule" "start_monday_morning" {
  name                = "${var.project_name}-start-monday-morning"
  description         = "月曜13:00にインスタンスを起動"
  schedule_expression = "cron(0 4 ? * MON *)"

  tags = {
    Name = "${var.project_name}-start-monday-morning"
  }
}

resource "aws_cloudwatch_event_target" "start_monday_morning" {
  rule      = aws_cloudwatch_event_rule.start_monday_morning.name
  target_id = "StartInstancesMonday"
  arn       = aws_lambda_function.start_instances.arn
}

resource "aws_lambda_permission" "allow_eventbridge_start_monday" {
  statement_id  = "AllowExecutionFromEventBridgeMonday"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.start_instances.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.start_monday_morning.arn
}
