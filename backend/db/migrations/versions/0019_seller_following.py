"""seller follows, feed indexes, and digest preference

Revision ID: 0019_seller_following
Revises: 0018_account_security_privacy
Create Date: 2026-07-27 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision = "0019_seller_following"
down_revision = "0018_account_security_privacy"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "seller_follows",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("follower_id", sa.String(length=36), nullable=False),
        sa.Column("seller_id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "follower_id <> seller_id",
            name="ck_seller_follow_not_self",
        ),
        sa.ForeignKeyConstraint(
            ["follower_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["seller_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "follower_id",
            "seller_id",
            name="uq_seller_follow_follower_seller",
        ),
    )
    op.create_index(
        "ix_seller_follows_follower_created_id",
        "seller_follows",
        ["follower_id", "created_at", "id"],
    )
    op.create_index(
        "ix_seller_follows_seller_follower",
        "seller_follows",
        ["seller_id", "follower_id"],
    )
    with op.batch_alter_table("user_profiles") as batch:
        batch.add_column(
            sa.Column(
                "notify_followed_sellers",
                sa.Boolean(),
                nullable=False,
                server_default=sa.true(),
            )
        )
        batch.add_column(
            sa.Column(
                "followed_seller_digest_sent_at",
                sa.DateTime(timezone=True),
                nullable=True,
            )
        )
    op.create_index(
        "ix_user_profiles_follow_digest_due",
        "user_profiles",
        ["notify_followed_sellers", "followed_seller_digest_sent_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_user_profiles_follow_digest_due",
        table_name="user_profiles",
    )
    with op.batch_alter_table("user_profiles") as batch:
        batch.drop_column("followed_seller_digest_sent_at")
        batch.drop_column("notify_followed_sellers")
    op.drop_index(
        "ix_seller_follows_seller_follower",
        table_name="seller_follows",
    )
    op.drop_index(
        "ix_seller_follows_follower_created_id",
        table_name="seller_follows",
    )
    op.drop_table("seller_follows")
