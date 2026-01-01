# プロジェクト名（リソースの命名やタグ付けに使用）
variable "project_name" {
  description = "Project name for tagging"
  type        = string
  default     = "todo-app"
}

# 環境名（production, staging, devなど）
variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

# VPCのCIDRブロック（ネットワークの範囲）
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# データベースのマスターパスワード
# sensitive = true を設定することで、ログなどに値が表示されるのを防ぎます
variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

# EC2インスタンスにSSH接続するためのキーペア名
variable "key_name" {
  description = "Name of the SSH key pair"
  type        = string
  default     = "app-key"
}
