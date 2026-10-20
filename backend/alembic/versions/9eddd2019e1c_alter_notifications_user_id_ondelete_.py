"""alter notifications user_id ondelete cascade

Revision ID: 9eddd2019e1c
Revises: 780df2d8b006
Create Date: 2026-08-29 21:57:18.376542

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9eddd2019e1c'
down_revision: Union[str, Sequence[str], None] = '780df2d8b006'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_constraint("notifications_user_id_fkey", "notifications", type_="foreignkey")
    op.create_foreign_key(
        "notifications_user_id_fkey",
        "notifications", "users",
        ["user_id"], ["user_id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("notifications_user_id_fkey", "notifications", type_="foreignkey")
    op.create_foreign_key(
        "notifications_user_id_fkey",
        "notifications", "users",
        ["user_id"], ["user_id"],
        ondelete="SET NULL",
    )