"""Add missing role column to users table

Revision ID: a1b2c3d4e5f6
Revises: 5c9c827fcf7c
Create Date: 2026-01-25 20:45:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '5c9c827fcf7c'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ### ユーザーテーブルに role カラムを追加するマイグレーション ###
    
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('users')]
    
    # role カラムが存在しない場合のみ追加（べき等性の確保）
    if 'role' not in columns:
        op.add_column('users', sa.Column('role', sa.String(length=20), nullable=False, server_default='user'))
        # 既存の全ユーザーにデフォルト値 'user' が適用されます


def downgrade() -> None:
    # ### role カラムを削除する処理 ###
    
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('users')]
    
    if 'role' in columns:
        op.drop_column('users', 'role')
