"""account sessions, exports, and closure lifecycle

Revision ID: 0018_account_security_privacy
Revises: 0017_conversation_safety
Create Date: 2026-07-27 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision = "0018_account_security_privacy"
down_revision = "0017_conversation_safety"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "data_export_requests",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("storage_key", sa.String(length=500), nullable=True),
        sa.Column("download_token_hash", sa.String(length=64), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("downloaded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_data_export_requests_user_id"),
        "data_export_requests",
        ["user_id"],
    )
    op.create_index(
        op.f("ix_data_export_requests_status"),
        "data_export_requests",
        ["status"],
    )
    op.create_index(
        op.f("ix_data_export_requests_download_token_hash"),
        "data_export_requests",
        ["download_token_hash"],
        unique=True,
    )
    op.create_index(
        op.f("ix_data_export_requests_expires_at"),
        "data_export_requests",
        ["expires_at"],
    )
    op.create_index(
        op.f("ix_data_export_requests_downloaded_at"),
        "data_export_requests",
        ["downloaded_at"],
    )

    op.create_table(
        "account_closures",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("requested_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("scheduled_for", sa.DateTime(timezone=True), nullable=False),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("restoration_snapshot", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index(
        op.f("ix_account_closures_user_id"),
        "account_closures",
        ["user_id"],
        unique=True,
    )
    op.create_index(
        op.f("ix_account_closures_status"),
        "account_closures",
        ["status"],
    )
    op.create_index(
        op.f("ix_account_closures_requested_at"),
        "account_closures",
        ["requested_at"],
    )
    op.create_index(
        op.f("ix_account_closures_scheduled_for"),
        "account_closures",
        ["scheduled_for"],
    )
    op.create_index(
        op.f("ix_account_closures_cancelled_at"),
        "account_closures",
        ["cancelled_at"],
    )
    op.create_index(
        op.f("ix_account_closures_completed_at"),
        "account_closures",
        ["completed_at"],
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_account_closures_completed_at"), table_name="account_closures"
    )
    op.drop_index(
        op.f("ix_account_closures_cancelled_at"), table_name="account_closures"
    )
    op.drop_index(
        op.f("ix_account_closures_scheduled_for"), table_name="account_closures"
    )
    op.drop_index(
        op.f("ix_account_closures_requested_at"), table_name="account_closures"
    )
    op.drop_index(op.f("ix_account_closures_status"), table_name="account_closures")
    op.drop_index(op.f("ix_account_closures_user_id"), table_name="account_closures")
    op.drop_table("account_closures")

    op.drop_index(
        op.f("ix_data_export_requests_downloaded_at"),
        table_name="data_export_requests",
    )
    op.drop_index(
        op.f("ix_data_export_requests_expires_at"),
        table_name="data_export_requests",
    )
    op.drop_index(
        op.f("ix_data_export_requests_download_token_hash"),
        table_name="data_export_requests",
    )
    op.drop_index(
        op.f("ix_data_export_requests_status"),
        table_name="data_export_requests",
    )
    op.drop_index(
        op.f("ix_data_export_requests_user_id"),
        table_name="data_export_requests",
    )
    op.drop_table("data_export_requests")
