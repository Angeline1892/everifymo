"""add admin roles, role constraints, agency-aware rls

Revision ID: 49b7c92fedb5
Revises: 9eddd2019e1c
Create Date: 2026-09-07 12:58:55.331525

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '49b7c92fedb5'
down_revision: Union[str, Sequence[str], None] = '9eddd2019e1c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # 1. Backfill: rename the old 'superadmin' role value to 'national_admin'
    #    before the constraint below would otherwise reject it.
    op.execute("UPDATE users SET role = 'national_admin' WHERE role = 'superadmin'")

    # 2. Restrict role to the five valid values.
    op.execute("""
        ALTER TABLE users
        ADD CONSTRAINT chk_valid_role CHECK (
            role IN ('national_admin', 'fda_admin', 'lea_admin', 'fda_personnel', 'lea_personnel')
        )
    """)

    # 3. National Admin must have no region; every other role must have one.
    op.execute("""
        ALTER TABLE users
        ADD CONSTRAINT chk_role_region CHECK (
            (role = 'national_admin' AND region_id IS NULL)
            OR (role IN ('fda_admin', 'lea_admin', 'fda_personnel', 'lea_personnel') AND region_id IS NOT NULL)
        )
    """)

    # 4. Replace the region-only, superadmin-hardcoded RLS policy with a
    #    region+agency aware one under the new role names.
    op.execute("DROP POLICY region_isolation_policy ON users;")
    op.execute("""
        CREATE POLICY region_agency_isolation_policy ON users
        USING (
            current_setting('app.bypass_rls', true) = 'true'
            OR role = 'national_admin'
            OR (
                region_id::text = current_setting('app.current_region_id', true)
                AND (
                    (role IN ('fda_admin', 'fda_personnel') AND current_setting('app.current_agency', true) = 'FDA')
                    OR (role IN ('lea_admin', 'lea_personnel') AND current_setting('app.current_agency', true) = 'LEA-CIDG')
                )
            )
        );
    """)


def downgrade() -> None:
    """Downgrade schema."""

    op.execute("DROP POLICY region_agency_isolation_policy ON users;")
    op.execute("""
        CREATE POLICY region_isolation_policy ON users
        USING (
            current_setting('app.bypass_rls', true) = 'true'
            OR role = 'superadmin'
            OR region_id::text = current_setting('app.current_region_id', true)
        );
    """)

    op.execute("ALTER TABLE users DROP CONSTRAINT chk_role_region")
    op.execute("ALTER TABLE users DROP CONSTRAINT chk_valid_role")

    # Reverse the backfill last, so downgrade returns the DB to its
    # original state
    op.execute("UPDATE users SET role = 'superadmin' WHERE role = 'national_admin'")