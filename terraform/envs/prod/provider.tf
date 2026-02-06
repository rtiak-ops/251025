# ==========================================
# Terraform / Provider 設定
# ==========================================

terraform {
  # 使用する外部プロバイダー（ここでは AWS）の定義
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0" # AWS プロバイダーのメジャーバージョンを 5.0 系に固定
    }
  }
}

# AWS プロバイダーの動作設定
provider "aws" {
  region = "ap-northeast-1" # 東京リージョンをデフォルトとして使用
}
