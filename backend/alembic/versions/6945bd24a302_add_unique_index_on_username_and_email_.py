"""add unique index on username and email for verified accounts.

Revision ID: 6945bd24a302
Revises: 781a37e25bc1
Create Date: 2026-08-10 22:41:59.940140

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6945bd24a302'
down_revision: Union[str, Sequence[str], None] = '781a37e25bc1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint('consumer_account_table_username_key', 'consumer_account_table', type_='unique')
    op.drop_constraint('consumer_account_table_email_key', 'consumer_account_table', type_='unique')

    op.create_index(
        'consumer_account_username_verified_uidx',
        'consumer_account_table',
        ['username'],
        unique=True,
        postgresql_where=sa.text('is_verified = true'),
    )
    op.create_index(
        'consumer_account_email_verified_uidx',
        'consumer_account_table',
        ['email'],
        unique=True,
        postgresql_where=sa.text('is_verified = true'),
    )

def downgrade() -> None:
    op.drop_index('consumer_account_username_verified_uidx', table_name='consumer_account_table')
    op.drop_index('consumer_account_email_verified_uidx', table_name='consumer_account_table')
    op.create_unique_constraint('consumer_account_table_username_key', 'consumer_account_table', ['username'])
    op.create_unique_constraint('consumer_account_table_email_key', 'consumer_account_table', ['email'])