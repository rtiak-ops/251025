"""Initial migration

Revision ID: f126bdd973fc
Revises: 
Create Date: 2025-12-27 13:25:33.460105

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f126bdd973fc'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ### 初期テーブル（ユーザー、タスク）を作成するマイグレーション ###
    
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    # 1. users テーブルの作成（存在しない場合のみ）
    if 'users' not in existing_tables:
        op.create_table('users',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('email', sa.String(length=255), nullable=False),
            sa.Column('hashed_password', sa.String(length=255), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
        op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)

    # 2. todos テーブルの作成（存在しない場合のみ）
    if 'todos' not in existing_tables:
        op.create_table('todos',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('title', sa.String(length=100), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('completed', sa.Boolean(), nullable=True),
            sa.Column('order', sa.Integer(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('owner_id', sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_todos_id'), 'todos', ['id'], unique=False)
        op.create_index(op.f('ix_todos_owner_id'), 'todos', ['owner_id'], unique=False)


def downgrade() -> None:
    # ### 変更を元に戻す処理（テーブルの削除） ###
    
    op.drop_index(op.f('ix_todos_owner_id'), table_name='todos')
    op.drop_index(op.f('ix_todos_id'), table_name='todos')
    op.drop_table('todos')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
