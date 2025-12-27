"""
Alembic環境設定ファイル (env.py)

このファイルは、SQLAlchemyのモデル定義からデータベースのテーブルを
自動生成（マイグレーション）するための設定ファイルです。
"""
import asyncio
import os
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config
from dotenv import load_dotenv
from alembic import context

# --- 1. 環境設定の読み込み ---
load_dotenv()  # .envファイルから環境変数をロード

# Alembic設定オブジェクト（alembic.iniの内容にアクセス可能）
config = context.config

# logging.config（alembic.ini内の[loggers]などの設定を適用）
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# --- 2. プロジェクトのモデルをAlembicに認識させる ---
# プロジェクトのルートディレクトリをPythonの検索パスに追加
# これにより 'from app.models import ...' が正常に動作するようになります
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# マイグレーション対象となるモデルをインポート
from app.database import Base
from app.models import User, Todo  

# autogenerate（モデル変更の自動検知）のためにBaseのメタデータを指定
target_metadata = Base.metadata

# --- 3. データベース接続情報の設定 ---
# 環境変数 DATABASE_URL を優先的に使用する（セキュリティと柔軟性のため）
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL is None:
    raise ValueError("DATABASE_URLが設定されていません。.envファイルを確認してください。")

# alembic.iniの接続文字列を環境変数の値で上書き
config.set_main_option("sqlalchemy.url", DATABASE_URL)


def run_migrations_offline() -> None:
    """
    オフラインモードでの実行
    DBに直接接続せず、SQLスクリプトを出力する場合などに使用されます。
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """
    実際のマイグレーションを実行する（同期処理）
    後述の run_async_migrations から内部的に呼び出されます。
    """
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """
    非同期エンジンを作成し、マイグレーションを実行する
    """
    # .iniファイルの設定をベースに、プログラムでURLを動的に書き換える
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = DATABASE_URL
    
    # 非同期用の接続エンジンを作成
    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    # 非同期接続を開始
    async with connectable.connect() as connection:
        # マイグレーション自体は内部的に同期処理が必要なため run_sync を使用
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """
    通常（オンライン）モードでの実行
    非同期イベントループを作成し、マイグレーションを開始します。
    """
    asyncio.run(run_async_migrations())


# Alembic実行時のメイン処理（オフラインかオンラインかを自動判定）
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()