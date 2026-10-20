"""add case reference counter table

Revision ID: 300e7cad4b20
Revises: 2c430b06285e
Create Date: 2026-07-27 16:05:42.585954

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '300e7cad4b20'
down_revision: Union[str, Sequence[str], None] = '2c430b06285e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE case_reference_counters (
            region_id UUID NOT NULL REFERENCES regions(region_id),
            year INTEGER NOT NULL,
            last_number INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (region_id, year)
        );
    """)

def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS case_reference_counters;")
