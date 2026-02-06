variable "project_name" {
  description = "Project name"
  type        = string
}

variable "ec2_instance_id" {
  description = "EC2 instance ID"
  type        = string
}

variable "rds_instance_id" {
  description = "RDS instance identifier"
  type        = string
}

variable "lambda_stop_zip" {
  description = "Path to stop lambda zip"
  type        = string
}

variable "lambda_start_zip" {
  description = "Path to start lambda zip"
  type        = string
}
