"""create consumer_otp_tokens

Revision ID: f5100677e978
Revises: 2d8595200ca2
Create Date: 2026-08-02 22:17:29.071668

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f5100677e978'
down_revision: Union[str, Sequence[str], None] = '2d8595200ca2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('consumer_otp_tokens',
    sa.Column('otp_id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('consumer_id', sa.UUID(), nullable=False),
    sa.Column('otp_hash', sa.Text(), nullable=False),
    sa.Column('purpose', sa.String(length=30), nullable=False),
    sa.Column('attempt_count', sa.Integer(), server_default=sa.text('0'), nullable=False),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('is_used', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['consumer_id'], ['consumer_account_table.consumer_id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('otp_id')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('consumer_otp_tokens')