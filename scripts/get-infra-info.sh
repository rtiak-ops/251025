#!/bin/bash
# 最新のインフラ情報を取得して GITHUB_OUTPUT に設定するスクリプト

set -e

echo "最新のインフラ情報を取得中..."

# 1. バックエンドを動かすEC2サーバーの情報を取得
INSTANCE_INFO=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=todo-app-ec2" "Name=instance-state-name,Values=running" \
  --query "Reservations[0].Instances[0].[PublicIpAddress,InstanceId]" \
  --output text)

IP=$(echo "$INSTANCE_INFO" | awk '{print $1}')
ID=$(echo "$INSTANCE_INFO" | awk '{print $2}')

if [ "$IP" == "None" ] || [ -z "$IP" ]; then
  echo "エラー: 起動中のEC2インスタンスが見つかりませんでした。"
  exit 1
fi

echo "EC2 IP: $IP"
echo "EC2 ID: $ID"
echo "ec2_ip=$IP" >> $GITHUB_OUTPUT
echo "instance_id=$ID" >> $GITHUB_OUTPUT

# 2. フロントエンドのファイルを置くS3バケット名を取得
S3_ARN=$(aws resourcegroupstaggingapi get-resources \
  --tag-filters Key=Name,Values=todo-app-frontend-bucket \
  --query "ResourceTagMappingList[0].ResourceARN" \
  --output text)

if [ "$S3_ARN" == "None" ] || [ -z "$S3_ARN" ]; then
  echo "エラー: S3バケットが見つかりませんでした。"
  exit 1
fi

S3_BUCKET_NAME=${S3_ARN##*:}
echo "S3 Bucket: $S3_BUCKET_NAME"
echo "s3_bucket=$S3_BUCKET_NAME" >> $GITHUB_OUTPUT

# 3. CloudFrontの情報を取得
CF_ARN=$(aws resourcegroupstaggingapi get-resources \
  --resource-type-filters cloudfront:distribution \
  --tag-filters Key=Name,Values=todo-app-cloudfront \
  --query "ResourceTagMappingList[0].ResourceARN" \
  --output text)

if [ "$CF_ARN" == "None" ] || [ -z "$CF_ARN" ]; then
  echo "警告: タグでCloudFrontが見つかりませんでした。S3バケット名から検索を試みます..."
  CF_ID=$(aws cloudfront list-distributions \
    --query "DistributionList.Items[?Origins.Items[?contains(DomainName, '$S3_BUCKET_NAME')]].Id" \
    --output text | awk '{print $1}' | tr -d '\r\n ')
else
  CF_ID=$(echo "${CF_ARN##*/}" | tr -d '\r\n ')
fi

if [ "$CF_ID" == "None" ] || [ -z "$CF_ID" ] || [ "$CF_ID" == "null" ]; then
  echo "エラー: 対象のCloudFrontが見つかりませんでした。"
  exit 1
fi

CF_DOMAIN=$(aws cloudfront get-distribution --id "$CF_ID" --query "Distribution.DomainName" --output text | tr -d '\r\n ')
echo "CloudFront ID: $CF_ID"
echo "CloudFront Domain: $CF_DOMAIN"
echo "cf_domain=$CF_DOMAIN" >> $GITHUB_OUTPUT
echo "cf_id=$CF_ID" >> $GITHUB_OUTPUT

# 4. データベース(RDS)の接続先アドレスを取得
RDS_ENDPOINT=$(aws rds describe-db-instances \
  --filters "Name=db-instance-id,Values=todo-app-db" \
  --query "DBInstances[0].Endpoint.Address" \
  --output text)

echo "RDS Endpoint: $RDS_ENDPOINT"
echo "rds_endpoint=$RDS_ENDPOINT" >> $GITHUB_OUTPUT
