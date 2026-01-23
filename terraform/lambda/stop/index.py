import boto3  # AWSのサービスを操作するライブラリ
import os     # 環境変数を読み取るライブラリ

# AWSのEC2とRDSを操作するクライアントを作成
ec2 = boto3.client('ec2')
rds = boto3.client('rds')

# Lambda関数のメイン処理（EventBridgeから呼び出されます）
def handler(event, context):
    # 環境変数から停止対象のインスタンスIDを取得
    ec2_instance_id = os.environ['EC2_INSTANCE_ID']
    rds_instance_id = os.environ['RDS_INSTANCE_ID']
    
    # EC2インスタンスを停止
    try:
        ec2.stop_instances(InstanceIds=[ec2_instance_id])
        print(f'EC2インスタンス {ec2_instance_id} を停止しました')
    except Exception as e:
        print(f'EC2停止エラー: {e}')  # エラーが出てもRDS停止は続行
    
    # RDSインスタンスを停止
    try:
        rds.stop_db_instance(DBInstanceIdentifier=rds_instance_id)
        print(f'RDSインスタンス {rds_instance_id} を停止しました')
    except Exception as e:
        print(f'RDS停止エラー: {e}')
    
    # 処理結果を返す
    return {
        'statusCode': 200,
        'body': 'インスタンスを停止しました'
    }
