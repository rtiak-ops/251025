"""Business upgrade: projects and task enhancements

Revision ID: 4a2d3e4f5g6h
Revises: f126bdd973fc
Create Date: 2026-01-10 13:40:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '4a2d3e4f5g6h'
down_revision = 'f126bdd973fc'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # 1. projectsテーブルの作成
    op.create_table('projects',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_projects_id'), 'projects', ['id'], unique=False)
    op.create_index(op.f('ix_projects_owner_id'), 'projects', ['owner_id'], unique=False)

    # 2. todosテーブルへのカラム追加
    op.add_column('todos', sa.Column('project_id', sa.Integer(), nullable=True))
    op.add_column('todos', sa.Column('status', sa.String(length=20), nullable=False, server_default='TODO'))
    op.add_column('todos', sa.Column('priority', sa.String(length=20), nullable=False, server_default='MEDIUM'))
    op.add_column('todos', sa.Column('due_date', sa.DateTime(timezone=True), nullable=True))
    
    # 外部キー制約の追加
    op.create_foreign_key('fk_todo_project', 'todos', 'projects', ['project_id'], ['id'], ondelete='SET NULL')
    op.create_index(op.f('ix_todos_project_id'), 'todos', ['project_id'], unique=False)

def downgrade() -> None:
    # 外部キーとインデックスの削除
    op.drop_constraint('fk_todo_project', 'todos', type_='foreignkey')
    op.drop_index(op.f('ix_todos_project_id'), table_name='todos')
    
    # カラムの削除
    op.drop_column('todos', 'due_date')
    op.drop_column('todos', 'priority')
    op.drop_column('todos', 'status')
    op.drop_column('todos', 'project_id')
    
    # projectsテーブルの削除
    op.drop_index(op.f('ix_projects_owner_id'), table_name='projects')
    op.drop_index(op.f('ix_projects_id'), table_name='projects')
    op.drop_table('projects')
