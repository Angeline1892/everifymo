"""enable RLS on users table

Revision ID: 0f77a280be74
Revises: 3748a26b3155
Create Date: 2026-07-02 18:44:21.757063

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0f77a280be74'
down_revision: Union[str, Sequence[str], None] = '3748a26b3155'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("ALTER TABLE users ENABLE ROW LEVEL SECURITY;")  

    op.execute("""
    CREATE POLICY region_isolation_policy ON users
    USING (
        current_setting('app.bypass_rls', true) = 'true'
        OR role = 'superadmin'
        OR region_id::text = current_setting('app.current_region_id', true)
        );
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP POLICY region_isolation_policy ON users;")         
    op.execute("ALTER TABLE users DISABLE ROW LEVEL SECURITY;")   
