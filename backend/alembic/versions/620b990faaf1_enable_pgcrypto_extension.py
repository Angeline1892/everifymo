"""enable pgcrypto extension

Revision ID: 620b990faaf1
Revises: a9ca97514be0
Create Date: 2026-07-01 19:57:25.112742

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '620b990faaf1'
down_revision: Union[str, Sequence[str], None] = 'a9ca97514be0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")

def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP EXTENSION IF EXISTS pgcrypto;")
