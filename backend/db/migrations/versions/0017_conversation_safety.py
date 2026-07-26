"""conversation blocks, preferences, and reports

Revision ID: 0017_conversation_safety
Revises: 0016_phone_verification_trust
Create Date: 2026-07-27 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision = "0017_conversation_safety"
down_revision = "0016_phone_verification_trust"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "user_blocks",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("blocker_id", sa.String(length=36), nullable=False),
        sa.Column("blocked_id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("blocker_id <> blocked_id", name="ck_user_block_not_self"),
        sa.ForeignKeyConstraint(["blocked_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["blocker_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "blocker_id", "blocked_id", name="uq_user_block_direction"
        ),
    )
    op.create_index(
        op.f("ix_user_blocks_blocker_id"), "user_blocks", ["blocker_id"]
    )
    op.create_index(
        op.f("ix_user_blocks_blocked_id"), "user_blocks", ["blocked_id"]
    )

    op.create_table(
        "conversation_preferences",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("conversation_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("muted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["conversation_id"], ["conversations.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "conversation_id",
            "user_id",
            name="uq_conversation_preference_user",
        ),
    )
    op.create_index(
        op.f("ix_conversation_preferences_conversation_id"),
        "conversation_preferences",
        ["conversation_id"],
    )
    op.create_index(
        op.f("ix_conversation_preferences_user_id"),
        "conversation_preferences",
        ["user_id"],
    )
    op.create_index(
        op.f("ix_conversation_preferences_muted_at"),
        "conversation_preferences",
        ["muted_at"],
    )

    op.create_table(
        "conversation_reports",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("conversation_id", sa.String(length=36), nullable=False),
        sa.Column("message_id", sa.String(length=36), nullable=True),
        sa.Column("reporter_id", sa.String(length=36), nullable=False),
        sa.Column("reported_user_id", sa.String(length=36), nullable=False),
        sa.Column("reason", sa.String(length=50), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("content_snapshot", sa.JSON(), nullable=False),
        sa.Column("moderation_case_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["conversation_id"], ["conversations.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["message_id"], ["messages.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["moderation_case_id"], ["moderation_cases.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["reported_user_id"], ["users.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["reporter_id"], ["users.id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("moderation_case_id"),
    )
    op.create_index(
        op.f("ix_conversation_reports_conversation_id"),
        "conversation_reports",
        ["conversation_id"],
    )
    op.create_index(
        op.f("ix_conversation_reports_message_id"),
        "conversation_reports",
        ["message_id"],
    )
    op.create_index(
        op.f("ix_conversation_reports_reporter_id"),
        "conversation_reports",
        ["reporter_id"],
    )
    op.create_index(
        op.f("ix_conversation_reports_reported_user_id"),
        "conversation_reports",
        ["reported_user_id"],
    )
    op.create_index(
        op.f("ix_conversation_reports_reason"),
        "conversation_reports",
        ["reason"],
    )
    op.create_index(
        op.f("ix_conversation_reports_moderation_case_id"),
        "conversation_reports",
        ["moderation_case_id"],
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_conversation_reports_moderation_case_id"),
        table_name="conversation_reports",
    )
    op.drop_index(
        op.f("ix_conversation_reports_reason"),
        table_name="conversation_reports",
    )
    op.drop_index(
        op.f("ix_conversation_reports_reported_user_id"),
        table_name="conversation_reports",
    )
    op.drop_index(
        op.f("ix_conversation_reports_reporter_id"),
        table_name="conversation_reports",
    )
    op.drop_index(
        op.f("ix_conversation_reports_message_id"),
        table_name="conversation_reports",
    )
    op.drop_index(
        op.f("ix_conversation_reports_conversation_id"),
        table_name="conversation_reports",
    )
    op.drop_table("conversation_reports")

    op.drop_index(
        op.f("ix_conversation_preferences_muted_at"),
        table_name="conversation_preferences",
    )
    op.drop_index(
        op.f("ix_conversation_preferences_user_id"),
        table_name="conversation_preferences",
    )
    op.drop_index(
        op.f("ix_conversation_preferences_conversation_id"),
        table_name="conversation_preferences",
    )
    op.drop_table("conversation_preferences")

    op.drop_index(op.f("ix_user_blocks_blocked_id"), table_name="user_blocks")
    op.drop_index(op.f("ix_user_blocks_blocker_id"), table_name="user_blocks")
    op.drop_table("user_blocks")
