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
    # テーブルが存在するか確認するためのインスペクターを取得
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    # 1. projectsテーブルの作成
    if 'projects' not in existing_tables:
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
    existing_columns = [c['name'] for c in inspector.get_columns('todos')]
    
    if 'project_id' not in existing_columns:
        op.add_column('todos', sa.Column('project_id', sa.Integer(), nullable=True))
    
    if 'status' not in existing_columns:
        op.add_column('todos', sa.Column('status', sa.String(length=20), nullable=False, server_default='TODO'))
    
    if 'priority' not in existing_columns:
        op.add_column('todos', sa.Column('priority', sa.String(length=20), nullable=False, server_default='MEDIUM'))
    
    if 'due_date' not in existing_columns:
        op.add_column('todos', sa.Column('due_date', sa.DateTime(timezone=True), nullable=True))
    
    # 外部キー制約の追加（制約が存在しない場合のみ）
    existing_fks = inspector.get_foreign_keys('todos')
    fk_names = [fk['name'] for fk in existing_fks]
    if 'fk_todo_project' not in fk_names:
        op.create_foreign_key('fk_todo_project', 'todos', 'projects', ['project_id'], ['id'], ondelete='SET NULL')
    
    # インデックスの追加（インデックス名、または対象カラムにインデックスがあるか確認）
    existing_indexes = [idx['name'] for idx in inspector.get_indexes('todos')]
    if op.f('ix_todos_project_id') not in existing_indexes:
        op.create_index(op.f('ix_todos_project_id'), 'todos', ['project_id'], unique=False)

def downgrade() -> None:
    # インスペクターを取得
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    # 外部キーとインデックスの削除
    if 'todos' in existing_tables:
        existing_fks = inspector.get_foreign_keys('todos')
        fk_names = [fk['name'] for fk in existing_fks]
        if 'fk_todo_project' in fk_names:
            op.drop_constraint('fk_todo_project', 'todos', type_='foreignkey')
        
        existing_indexes = [idx['name'] for idx in inspector.get_indexes('todos')]
        if op.f('ix_todos_project_id') in existing_indexes:
            op.drop_index(op.f('ix_todos_project_id'), table_name='todos')
        
        # カラムの削除
        existing_columns = [c['name'] for c in inspector.get_columns('todos')]
        for col in ['due_date', 'priority', 'status', 'project_id']:
            if col in existing_columns:
                op.drop_column('todos', col)
    
    # projectsテーブルの削除
    if 'projects' in existing_tables:
        existing_indexes = [idx['name'] for idx in inspector.get_indexes('projects')]
        if op.f('ix_projects_owner_id') in existing_indexes:
            op.drop_index(op.f('ix_projects_owner_id'), table_name='projects')
        if op.f('ix_projects_id') in existing_indexes:
            op.drop_index(op.f('ix_projects_id'), table_name='projects')
        op.drop_table('projects')
