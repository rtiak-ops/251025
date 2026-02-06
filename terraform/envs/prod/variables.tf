# ==========================================
# 変数定義 (Variables)
# ==========================================

# リソースの命名やタグ付けに使用するプロジェクト識別名
variable "project_name" {
  description = "Project name for tagging and naming resources"
  type        = string
  default     = "todo-app"
}

# 環境名 (例: production, staging, dev)
variable "environment" {
  description = "Environment name (e.g., production, staging)"
  type        = string
  default     = "production"
}

# VPC の IP アドレス範囲 (CIDR ブロック)
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# RDS データベースのマスターパスワード
# ※ セキュリティのため terraform.tfvars 等で外部から渡すことを推奨
variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true # Terraform の出力やログ上で値を非表示にします
}

# EC2 インスタンスにログインするための SSH キーペア名
variable "key_name" {
  description = "Name of the AWS SSH key pair"
  type        = string
  default     = "app-key"
}

# アプリケーション内部で使用するシークレットキー (FastAPI の認証等)
variable "secret_key" {
  description = "Secret key for application security (FastAPI)"
  type        = string
  sensitive   = true
}

# 外部サービス連携用の Google API キー
variable "google_api_key" {
  description = "Google API key for external services"
  type        = string
  sensitive   = true
}

# GitHub リポジトリ名 (IAM ロールで使用)
variable "github_repo" {
  description = "GitHub repository (e.g. user/repo)"
  type        = string
  default     = "rtiak-ops/251025"
}
