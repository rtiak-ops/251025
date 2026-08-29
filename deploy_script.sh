#!/bin/bash
set -e
PROJECT_DIR="/home/ec2-user/learning-app"

# プロジェクトフォルダがない場合はクローン、ある場合は移動
if [ ! -d "" ]; then
  sudo -u ec2-user git clone https://github.com/.git ""
fi
cd ""

# 最新のソースを取得
sudo -u ec2-user git fetch origin 
sudo -u ec2-user git reset --hard origin/

# 環境変数ファイル (.env) を作成
{
  printf 'DATABASE_URL=postgresql+asyncpg://postgresMaster:%s@%s/todo_db?ssl=require\n' "" ""
  echo "POSTGRES_USER=postgresMaster"
  printf 'POSTGRES_PASSWORD=%s\n' ""
  echo "POSTGRES_DB=todo_db"
  printf 'SECRET_KEY=%s\n' ""
  echo "ENV=production"
  echo "DOMAIN_NAME="
  echo "CORS_ORIGINS=https://,http://"
} > .env
chown ec2-user:ec2-user .env

# Dockerコンテナの起動
sudo systemctl start docker
sudo docker compose up -d --build

# データベースのマイグレーション
echo "Waiting for app to start..."
sleep 20
sudo docker compose exec -T backend alembic upgrade head
