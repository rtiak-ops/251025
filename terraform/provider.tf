# Terraformの設定ブロック
# 使用するプロバイダーや、Terraformのバージョン制約などを定義します
terraform {
  required_providers {
    # AWSプロバイダーの使用を宣言
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# AWSプロバイダーの設定
# インフラを構築するリージョンを指定します
provider "aws" {
  region = "ap-northeast-1" # 東京リージョン
}
