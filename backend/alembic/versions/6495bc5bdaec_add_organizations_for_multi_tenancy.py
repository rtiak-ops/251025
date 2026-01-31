"""Add organizations for multi-tenancy

Revision ID: 6495bc5bdaec
Revises: 4a2d3e4f5g6h
Create Date: 2026-01-13 08:45:52.524328

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '6495bc5bdaec'
down_revision = '4a2d3e4f5g6h'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ### マルチテナント（組織）対応のための基盤作成マイグレーション ###
    
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    # 1. プロジェクトテーブルに組織IDを追加
    proj_columns = [c['name'] for c in inspector.get_columns('projects')]
    if 'organization_id' not in proj_columns:
        op.add_column('projects', sa.Column('organization_id', sa.Integer(), nullable=True))
        op.create_index(op.f('ix_projects_organization_id'), 'projects', ['organization_id'], unique=False)
        op.create_foreign_key('fk_projects_org_id', 'projects', 'organizations', ['organization_id'], ['id'], ondelete='CASCADE')
    
    # 2. タスク（todos）の古い制約を調整
    todos_fks = [fk['name'] for fk in inspector.get_foreign_keys('todos')]
    # 古い制約名または Alembic が生成した名前が存在すれば削除
    if 'fk_todo_project' in todos_fks:
        op.drop_constraint('fk_todo_project', 'todos', type_='foreignkey')
    elif op.f('fk_todo_project') in todos_fks:
        op.drop_constraint(op.f('fk_todo_project'), 'todos', type_='foreignkey')
        
    # 3. ユーザーテーブルに組織IDを追加（所属組織の管理）
    user_columns = [c['name'] for c in inspector.get_columns('users')]
    if 'organization_id' not in user_columns:
        op.add_column('users', sa.Column('organization_id', sa.Integer(), nullable=True))
        op.create_index(op.f('ix_users_organization_id'), 'users', ['organization_id'], unique=False)
        op.create_foreign_key('fk_users_org_id', 'users', 'organizations', ['organization_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    # ### 変更を元に戻す処理 ###
    
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    # 1. ユーザーテーブルの組織関連情報を削除
    user_columns = [c['name'] for c in inspector.get_columns('users')]
    if 'organization_id' in user_columns:
        user_fks = [fk['name'] for fk in inspector.get_foreign_keys('users')]
        if 'fk_users_org_id' in user_fks:
            op.drop_constraint('fk_users_org_id', 'users', type_='foreignkey')
        op.drop_index(op.f('ix_users_organization_id'), table_name='users')
        op.drop_column('users', 'organization_id')
        
    # 2. タスク（todos）の制約を復元
    todos_fks = [fk['name'] for fk in inspector.get_foreign_keys('todos')]
    if 'fk_todo_project' not in todos_fks and op.f('fk_todo_project') not in todos_fks:
        op.create_foreign_key('fk_todo_project', 'todos', 'projects', ['project_id'], ['id'], ondelete='SET NULL')
        
    # 3. プロジェクトテーブルの組織関連情報を削除
    proj_columns = [c['name'] for c in inspector.get_columns('projects')]
    if 'organization_id' in proj_columns:
        proj_fks = [fk['name'] for fk in inspector.get_foreign_keys('projects')]
        if 'fk_projects_org_id' in proj_fks:
            op.drop_constraint('fk_projects_org_id', 'projects', type_='foreignkey')
        op.drop_index(op.f('ix_projects_organization_id'), table_name='projects')
        op.drop_column('projects', 'organization_id')
