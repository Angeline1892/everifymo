"""fix_admin_notifications_agency_constraint

Revision ID: ecfc0050a6a6
Revises: ac6fb99f83cd
Create Date: 2026-09-17 18:48:21.735265

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ecfc0050a6a6'
down_revision: Union[str, Sequence[str], None] = 'ac6fb99f83cd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# CHANGED: widens ck_admin_notifications_agency from ('FDA','LEA') to
# ('FDA','LEA-CIDG') — the constraint was left over from before the
# table was renamed off superadmin_notifications and never updated to
# match Role.AGENCY_ROLES's actual key ("LEA-CIDG", not "LEA")
def upgrade() -> None:
    op.drop_constraint('ck_admin_notifications_agency', 'admin_notifications', type_='check')
    op.create_check_constraint(
        'ck_admin_notifications_agency',
        'admin_notifications',
        "agency IS NULL OR agency IN ('FDA', 'LEA-CIDG')",
    )

def downgrade() -> None:
    op.drop_constraint('ck_admin_notifications_agency', 'admin_notifications', type_='check')
    op.create_check_constraint(
        'ck_admin_notifications_agency',
        'admin_notifications',
        "agency IS NULL OR agency IN ('FDA', 'LEA')",
    )
