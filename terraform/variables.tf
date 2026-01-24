# ==================================================================================================
# 変数（variables）：設定値の「受け皿」
# ==================================================================================================

variable "project_name" {                  # 「プロジェクト名」という空箱（変数）を用意します
  description = "Project name for tagging" # この箱が何のためのものか、メモを書いておきます
  type        = string                     # この箱には「文字（string）」しか入れられません
  default     = "todo-app"                 # もし何も入れなかったら、自動的に「todo-app」になります
}                                          # project_nameの設定を閉じます

variable "environment" {           # 「環境名（本番用か、開発用か）」という箱を用意します
  description = "Environment name" # 箱の説明です
  type        = string             # 文字列の箱です
  default     = "production"       # 何も入れなかったら「production（本番）」になります
}                                  # environmentの設定を閉じます

variable "vpc_cidr" {                # 「ネットワークの広さ」という箱を用意します
  description = "CIDR block for VPC" # 箱の説明です
  type        = string               # 文字列の箱です
  default     = "10.0.0.0/16"        # 何も入れなかったら、標準的な広さ「10.0.0.0/16」になります
}                                    # vpc_cidrの設定を閉じます

variable "db_password" {                   # 「データベースのパスワード」という箱を用意します
  description = "Database master password" # 箱の説明です
  type        = string                     # 文字列の箱です
  sensitive   = true                       # 重要：この箱の中身は画面やログに見せないようにします（秘密！）
}                                          # db_passwordの設定を閉じます

variable "key_name" {                      # 「ログイン用の鍵の名前」という箱を用意します
  description = "Name of the SSH key pair" # 箱の説明です
  type        = string                     # 文字列の箱です
  default     = "app-key"                  # 何も入れなかったら「app-key」という鍵を使います
}                                          # key_nameの設定を閉じます

variable "secret_key" {                               # 「アプリケーションの秘密鍵」という箱を用意します
  description = "Secret key for application security" # 箱の説明です
  type        = string                                # 文字列の箱です
  sensitive   = true                                  # 重要：この箱の中身は画面やログに見せないようにします（秘密！）
}                                                     # secret_keyの設定を閉じます

variable "google_api_key" {                   # 「Google APIキー」という箱を用意します
  description = "Google API key for services" # 箱の説明です
  type        = string                        # 文字列の箱です
  sensitive   = true                          # 重要：この箱の中身は画面やログに見せないようにします（秘密！）
}                                             # google_api_keyの設定を閉じます
