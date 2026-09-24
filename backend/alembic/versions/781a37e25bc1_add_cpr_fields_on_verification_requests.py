"""add cpr fields on verification_requests

Revision ID: 781a37e25bc1
Revises: 7db97c72b535
Create Date: 2026-08-04 22:47:52.361570

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '781a37e25bc1'
down_revision: Union[str, Sequence[str], None] = '7db97c72b535'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('verification_requests', sa.Column('cpr_number', sa.String(length=100), nullable=True))
    op.add_column('verification_requests', sa.Column('cpr_expiry', sa.Date(), nullable=True))
    op.add_column('verification_requests', sa.Column('unregistered_reason', sa.Text(), nullable=True))

    # Manually added — Alembic autogenerate does not detect CheckConstraint
    # changes by default, so these two never got picked up automatically.
    op.create_check_constraint(
        'ck_verification_requests_registered_fields_required',
        'verification_requests',
        "(verification_request_status != 'confirmed_registered') OR "
        "(cpr_number IS NOT NULL AND response_notes IS NOT NULL)",
    )
    op.create_check_constraint(
        'ck_verification_requests_unregistered_reason_required',
        'verification_requests',
        "(verification_request_status != 'confirmed_unregistered') OR "
        "(unregistered_reason IS NOT NULL)",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('ck_verification_requests_unregistered_reason_required', 'verification_requests', type_='check')
    op.drop_constraint('ck_verification_requests_registered_fields_required', 'verification_requests', type_='check')

    op.drop_column('verification_requests', 'unregistered_reason')
    op.drop_column('verification_requests', 'cpr_expiry')
    op.drop_column('verification_requests', 'cpr_number')