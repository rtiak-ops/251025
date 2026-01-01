# --------------------------------------------------------------------------------------------------
# ネットワーク設定 (VPC)
# --------------------------------------------------------------------------------------------------
# AWS上に自分専用の「仮想ネットワーク（庭）」を作成します。

# 1. VPC (Virtual Private Cloud) の作成
# アプリケーションが動くための大きな枠組み（ネットワーク空間）です。
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr # ネットワークの広さ（例: 10.0.0.0/16）を指定
  enable_dns_hostnames = true         # インスタンスにホスト名（ドメイン名のようなもの）を割り当てる許可
  enable_dns_support   = true         # AWSのDNS解決機能を使う設定

  tags = {
    Name = "${var.project_name}-vpc"
  }
}

# 2. パブリックサブネットの作成
# 外部（インターネット）からアクセス可能なエリアです。Webサーバー（EC2）などを置きます。
# count = 2 とすることで、2つの異なる場所に作って「片方が壊れても大丈夫」な構成にします。
resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.${count.index}.0/24" # ネットワーク内の小さな区画（住所）
  availability_zone       = data.aws_availability_zones.available.names[count.index] # 場所（データセンター）を分散
  map_public_ip_on_launch = true # ここで起動したサーバーに自動で公開IPアドレスを付与する

  tags = {
    Name = "${var.project_name}-public-subnet-${count.index + 1}"
  }
}

# 3. プライベートサブネットの作成
# インターネットから直接アクセスできない安全なエリアです。データベース（RDS）などを置きます。
resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "${var.project_name}-private-subnet-${count.index + 1}"
  }
}

# 4. インターネットゲートウェイ (IGW)
# このネットワークから外の世界（インターネット）に出るための「玄関」です。
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-igw"
  }
}

# 5. ルートテーブル (道しるべ)
# ネットワーク内の通信をどこに飛ばすかを決めるルールです。
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  # 「外の世界（0.0.0.0/0）」に行きたいときは、上の玄関（IGW）を通るように設定
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${var.project_name}-public-rt"
  }
}

# 6. サブネットとルートテーブルの紐付け
# パブリックサブネットが、上の「道しるべ」を使うように設定します。
resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# 利用可能なデータセンター（アベイラビリティゾーン）の情報を取得
data "aws_availability_zones" "available" {
  state = "available"
}
