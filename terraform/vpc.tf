# ==========================================
# VPC ネットワーク設定
# ==========================================

# ------------------------------------------
# 1. VPC 本体
# ------------------------------------------

# プロジェクト専用の仮想ネットワーク環境を構築
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr # VPC 全体で利用可能な IP アドレス範囲
  enable_dns_hostnames = true         # インスタンスにホスト名 (例: ip-10-0-x-x.ap-northeast-1.compute.internal) を付与
  enable_dns_support   = true         # AWS の DNS サーバーを有効化

  tags = {
    Name = "${var.project_name}-vpc"
  }
}

# 利用可能なアベイラビリティゾーン (AZ) の取得
# 指定したリージョン内で利用可能なAZのリストをデータソースとして取得します。
data "aws_availability_zones" "available" {
  state = "available"
}

# ------------------------------------------
# 2. サブネット (分割されたネットワーク領域)
# ------------------------------------------

# パブリックサブネット
# インターネットに直接通信が可能な領域（EC2 Web サーバーなどを配置）
resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.${count.index}.0/24"                      # VPC 内での IP 範囲
  availability_zone       = data.aws_availability_zones.available.names[count.index] # 可用性を高めるための設置場所 (AZ)
  map_public_ip_on_launch = true                                            # このサブネットで起動したサーバにパブリック IP を自動で割り振る

  tags = {
    Name = "${var.project_name}-public-subnet-${count.index}"
  }
}

# プライベートサブネット
# 内部からのアクセスのみを許可する安全な領域（データベース RDS などを配置）
resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${10 + count.index}.0/24"                 # VPC 内での IP 範囲
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "${var.project_name}-private-subnet-${count.index}"
  }
}

# ------------------------------------------
# 3. 外部との通信・ルーティング設定
# ------------------------------------------

# インターネットゲートウェイ (IGW)
# VPC 内のパブリックサブネットがインターネットと通信するための出口/入口
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-igw"
  }
}

# ルートテーブル (パブリック用)
# 「宛先が自分（VPC 内）以外ならインターネットゲートウェイへ送る」というルールを定義
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"                  # 全ての通信
    gateway_id = aws_internet_gateway.main.id # ターゲットとして IGW を指定
  }

  tags = {
    Name = "${var.project_name}-public-rt"
  }
}

# ルートテーブルとパブリックサブネットの紐付け
# これにより、パブリックサブネットが実際にインターネット通信可能になります
resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}
