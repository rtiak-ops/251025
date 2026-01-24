# ==================================================================================================
# 2. ネットワーク設定 (VPC)
# ==================================================================================================

resource "aws_vpc" "main" {           # 街全体（VPC）を作ります
  cidr_block           = var.vpc_cidr # 使う住所の範囲を指定します
  enable_dns_hostnames = true         # サーバーに名前を付けられるようにします
  enable_dns_support   = true         # AWSの住所解決サービスを使います

  tags = {                           # ふせん（タグ）を付けます
    Name = "${var.project_name}-vpc" # プロジェクト名を名札にします
  }                                  # タグ設定終了
}                                    # VPC設定終了

resource "aws_subnet" "public" {                                                     # 公開エリア（パブリックサブネット）を作ります
  count                   = 2                                                        # 全く同じエリアを2つ作ります（停電対策）
  vpc_id                  = aws_vpc.main.id                                          # 作った街（VPC）の中に配置します
  cidr_block              = "10.0.${count.index}.0/24"                               # 10.0.0.0 と 10.0.1.0 に自動で分けます
  availability_zone       = data.aws_availability_zones.available.names[count.index] # 東京の違う場所AとBに配置します
  map_public_ip_on_launch = true                                                     # ここに建てる家には自動で公開住所を付けます

  tags = {                                                        # タグを付けます
    Name = "${var.project_name}-public-subnet-${count.index + 1}" # 名前を自動で「1」「2」と振ります
  }                                                               # タグ設定終了
}                                                                 # 公開サブネット設定終了

resource "aws_subnet" "private" {                                              # 秘密エリア（プライベートサブネット）を作ります
  count             = 2                                                        # ここも停電対策で2つ作ります
  vpc_id            = aws_vpc.main.id                                          # 同じ街（VPC）の中に配置します
  cidr_block        = "10.0.${count.index + 10}.0/24"                          # 10.0.10.0 と 10.0.11.0 に分けます
  availability_zone = data.aws_availability_zones.available.names[count.index] # ここも場所AとBに分けます

  tags = {                                                         # タグを付けます
    Name = "${var.project_name}-private-subnet-${count.index + 1}" # 名前タグです
  }                                                                # タグ設定終了
}                                                                  # 秘密サブネット設定終了

resource "aws_internet_gateway" "main" { # 街の入り口（インターネットゲートウェイ）を作ります
  vpc_id = aws_vpc.main.id               # どの街の入り口か指定します

  tags = {                           # タグを付けます
    Name = "${var.project_name}-igw" # 名前タグです
  }                                  # タグ設定終了
}                                    # ゲートウェイ設定終了

resource "aws_route_table" "public" { # 地図（ルートテーブル）を作ります
  vpc_id = aws_vpc.main.id            # この街専用の地図です

  route {                                     # 道順を決めます
    cidr_block = "0.0.0.0/0"                  # 「世界中（どこでも）」に行きたい時は
    gateway_id = aws_internet_gateway.main.id # さっきの「街の入り口」を通るようにします
  }                                           # 道順設定終了

  tags = {                                 # タグを付けます
    Name = "${var.project_name}-public-rt" # 名前タグです
  }                                        # タグ設定終了
}                                          # ルートテーブル設定終了

resource "aws_route_table_association" "public" {    # 地図を配ります（紐付け）
  count          = 2                                 # 2つの公開エリアに配ります
  subnet_id      = aws_subnet.public[count.index].id # 公開エリアの住所です
  route_table_id = aws_route_table.public.id         # さっきの「入り口への道順」が書いてある地図です
}                                                    # 紐付け設定終了

data "aws_availability_zones" "available" { # AWSに「今使える場所の情報」を聞きます
  state = "available"                       # 使える場所だけ教えてもらいます
}                                           # 情報取得終了
