"""durable in-app notification center

Revision ID: 0015_in_app_notifications
Revises: 0014_search_discovery
Create Date: 2026-07-25 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision = "0015_in_app_notifications"
down_revision = "0014_search_discovery"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "user_notifications",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("recipient_id", sa.String(length=36), nullable=False),
        sa.Column("type", sa.String(length=50), nullable=False),
        sa.Column("actor_id", sa.String(length=36), nullable=True),
        sa.Column("entity_type", sa.String(length=40), nullable=True),
        sa.Column("entity_id", sa.String(length=64), nullable=True),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("deduplication_key", sa.String(length=180), nullable=False),
        sa.Column("last_event_id", sa.String(length=180), nullable=True),
        sa.Column("group_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_event_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["recipient_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "recipient_id",
            "deduplication_key",
            name="uq_user_notification_recipient_deduplication",
        ),
    )
    op.create_index(
        op.f("ix_user_notifications_recipient_id"),
        "user_notifications",
        ["recipient_id"],
    )
    op.create_index(
        op.f("ix_user_notifications_type"),
        "user_notifications",
        ["type"],
    )
    op.create_index(
        op.f("ix_user_notifications_actor_id"),
        "user_notifications",
        ["actor_id"],
    )
    op.create_index(
        op.f("ix_user_notifications_read_at"),
        "user_notifications",
        ["read_at"],
    )
    op.create_index(
        "ix_user_notifications_recipient_timeline",
        "user_notifications",
        ["recipient_id", "last_event_at", "id"],
    )
    op.create_index(
        "ix_user_notifications_recipient_unread",
        "user_notifications",
        ["recipient_id", "read_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_user_notifications_recipient_unread",
        table_name="user_notifications",
    )
    op.drop_index(
        "ix_user_notifications_recipient_timeline",
        table_name="user_notifications",
    )
    op.drop_index(
        op.f("ix_user_notifications_read_at"),
        table_name="user_notifications",
    )
    op.drop_index(
        op.f("ix_user_notifications_actor_id"),
        table_name="user_notifications",
    )
    op.drop_index(
        op.f("ix_user_notifications_type"),
        table_name="user_notifications",
    )
    op.drop_index(
        op.f("ix_user_notifications_recipient_id"),
        table_name="user_notifications",
    )
    op.drop_table("user_notifications")
