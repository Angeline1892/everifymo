"""remove queued status from verification request

Revision ID: 2c430b06285e
Revises: 3e75f8244f49
Create Date: 2026-07-13 17:45:26.563875

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2c430b06285e'
down_revision: Union[str, Sequence[str], None] = '3e75f8244f49'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Drop the old constraint that still allows 'queued'
    op.drop_constraint(
        'ck_verification_requests_status',
        'verification_requests',
        type_='check',
    )
    # Recreate it without 'queued' in the allowed list
    op.create_check_constraint(
        'ck_verification_requests_status',
        'verification_requests',
        "verification_request_status IN ('pending', 'confirmed_registered', "
        "'confirmed_unregistered', 'rejected', 'recalled')",
    )
    # Remove the server-side default — app code must now always pass
    # the status explicitly on insert
    op.alter_column(
        'verification_requests',
        'verification_request_status',
        server_default=None,
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Reverse of upgrade(), in reverse order — restore the default first...
    op.alter_column(
        'verification_requests',
        'verification_request_status',
        server_default=sa.text("'queued'"),
    )
    # ...then swap the constraint back to allow 'queued' again
    op.drop_constraint(
        'ck_verification_requests_status',
        'verification_requests',
        type_='check',
    )
    op.create_check_constraint(
        'ck_verification_requests_status',
        'verification_requests',
        "verification_request_status IN ('queued', 'pending', "
        "'confirmed_registered', 'confirmed_unregistered', 'rejected', 'recalled')",
    )
