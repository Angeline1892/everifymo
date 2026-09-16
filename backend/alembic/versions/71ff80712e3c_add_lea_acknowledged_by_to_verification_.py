"""add lea_acknowledged_by to verification_requests

Revision ID: 71ff80712e3c
Revises: efb55b2f5204
Create Date: 2026-08-19 16:35:14.259281

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '71ff80712e3c'
down_revision: Union[str, Sequence[str], None] = 'efb55b2f5204'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('verification_requests', sa.Column('lea_acknowledged_by', sa.UUID(), nullable=True))
    op.create_foreign_key(
        op.f('verification_requests_lea_acknowledged_by_fkey'),
        'verification_requests', 'users', ['lea_acknowledged_by'], ['user_id'], ondelete='SET NULL'
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(op.f('verification_requests_lea_acknowledged_by_fkey'), 'verification_requests', type_='foreignkey')
    op.drop_column('verification_requests', 'lea_acknowledged_by')
