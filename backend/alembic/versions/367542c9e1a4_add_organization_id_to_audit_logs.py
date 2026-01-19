"""Add organization_id to audit logs

Revision ID: 367542c9e1a4
Revises: 6495bc5bdaec
Create Date: 2026-01-13 08:47:08.698077

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '367542c9e1a4'
down_revision = '6495bc5bdaec'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ### 監査ログに組織IDを追加するマイグレーション ###
    
    # 既存のDB状態を確認するためのインスペクター
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('audit_logs')]
    
    # organization_id カラムが存在しない場合のみ追加（べき等性の確保）
    if 'organization_id' not in columns:
        # 1. カラムの追加
        op.add_column('audit_logs', sa.Column('organization_id', sa.Integer(), nullable=True))
        
        # 2. インデックスの作成（検索高速化のため）
        op.create_index(op.f('ix_audit_logs_organization_id'), 'audit_logs', ['organization_id'], unique=False)
        
        # 3. 外部キー制約の追加（organizationsテーブルとの紐付け）
        op.create_foreign_key('fk_audit_log_org_id', 'audit_logs', 'organizations', ['organization_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    # ### 変更を元に戻す処理 ###
    
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('audit_logs')]
    
    # organization_id カラムが存在する場合のみ削除
    if 'organization_id' in columns:
        # 外部キー制約の削除
        fks = inspector.get_foreign_keys('audit_logs')
        fk_names = [fk['name'] for fk in fks]
        if 'fk_audit_log_org_id' in fk_names:
            op.drop_constraint('fk_audit_log_org_id', 'audit_logs', type_='foreignkey')
        
        # インデックスとカラムの削除
        op.drop_index(op.f('ix_audit_logs_organization_id'), table_name='audit_logs')
        op.drop_column('audit_logs', 'organization_id')
