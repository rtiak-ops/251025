"""enhance_organization_model

Revision ID: 5c9c827fcf7c
Revises: 367542c9e1a4
Create Date: 2026-01-13 09:33:13.822874

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '5c9c827fcf7c'
down_revision = '367542c9e1a4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ### 組織モデルに法人情報などの詳細フィールドを追加するマイグレーション ###
    
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('organizations')]
    indexes = [idx['name'] for idx in inspector.get_indexes('organizations')]
    
    # 1. 法人番号 (corporate_id) の追加
    if 'corporate_id' not in columns:
        op.add_column('organizations', sa.Column('corporate_id', sa.String(length=13), nullable=True))
        # ユニークインデックスの作成（重複登録防止）
        if op.f('ix_organizations_corporate_id') not in indexes:
            op.create_index(op.f('ix_organizations_corporate_id'), 'organizations', ['corporate_id'], unique=True)
            
    # 2. ウェブサイトURL (website) の追加
    if 'website' not in columns:
        op.add_column('organizations', sa.Column('website', sa.String(length=255), nullable=True))
        
    # 3. 認証済みフラグ (is_verified) の追加
    if 'is_verified' not in columns:
        op.add_column('organizations', sa.Column('is_verified', sa.Boolean(), server_default='false', nullable=False))
        
    # 4. 組織名にユニークインデックスを追加（既に存在しないか確認）
    if op.f('ix_organizations_name') not in indexes:
        op.create_index(op.f('ix_organizations_name'), 'organizations', ['name'], unique=True)


def downgrade() -> None:
    # ### 変更を元に戻す処理 ###
    
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('organizations')]
    indexes = [idx['name'] for idx in inspector.get_indexes('organizations')]

    # インデックスの削除
    if op.f('ix_organizations_name') in indexes:
        op.drop_index(op.f('ix_organizations_name'), table_name='organizations')
        
    if op.f('ix_organizations_corporate_id') in indexes:
        op.drop_index(op.f('ix_organizations_corporate_id'), table_name='organizations')
        
    # カラムの削除（逆順で実行するのが一般的）
    if 'is_verified' in columns:
        op.drop_column('organizations', 'is_verified')
        
    if 'website' in columns:
        op.drop_column('organizations', 'website')
        
    if 'corporate_id' in columns:
        op.drop_column('organizations', 'corporate_id')
