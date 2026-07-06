"""p3 feature requests and notifications

Revision ID: 0005_p3_feature_notifications
Revises: 0004_search_fulltext
Create Date: 2026-07-06 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0005_p3_feature_notifications"
down_revision = "0004_search_fulltext"
branch_labels = None
depends_on = None


def timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    ]


def upgrade() -> None:
    with op.batch_alter_table("users") as batch:
        batch.add_column(sa.Column("email_unsubscribe_token_hash", sa.String(length=64), nullable=True))
    op.create_index(
        op.f("ix_users_email_unsubscribe_token_hash"),
        "users",
        ["email_unsubscribe_token_hash"],
        unique=True,
    )

    with op.batch_alter_table("user_profiles") as batch:
        batch.add_column(sa.Column("notify_messages", sa.Boolean(), nullable=False, server_default=sa.true()))
        batch.add_column(sa.Column("notify_saved_searches", sa.Boolean(), nullable=False, server_default=sa.true()))
        batch.add_column(sa.Column("notify_listing_expiry", sa.Boolean(), nullable=False, server_default=sa.true()))

    with op.batch_alter_table("conversations") as batch:
        batch.add_column(sa.Column("buyer_message_email_sent_at", sa.DateTime(timezone=True), nullable=True))
        batch.add_column(sa.Column("seller_message_email_sent_at", sa.DateTime(timezone=True), nullable=True))

    with op.batch_alter_table("messages") as batch:
        batch.add_column(sa.Column("notification_email_sent_at", sa.DateTime(timezone=True), nullable=True))

    with op.batch_alter_table("listings") as batch:
        batch.add_column(sa.Column("expiry_notice_sent_at", sa.DateTime(timezone=True), nullable=True))

    op.create_table(
        "feature_requests",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("listing_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("package_days", sa.Integer(), nullable=False),
        sa.Column("price_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("payment_reference", sa.String(length=80), nullable=False),
        sa.Column("admin_note", sa.Text(), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_by_admin_id", sa.String(length=36), nullable=True),
        *timestamps(),
        sa.ForeignKeyConstraint(["listing_id"], ["listings.id"]),
        sa.ForeignKeyConstraint(["resolved_by_admin_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_feature_requests_listing_id"), "feature_requests", ["listing_id"], unique=False)
    op.create_index(op.f("ix_feature_requests_payment_reference"), "feature_requests", ["payment_reference"], unique=True)
    op.create_index(op.f("ix_feature_requests_status"), "feature_requests", ["status"], unique=False)
    op.create_index(op.f("ix_feature_requests_user_id"), "feature_requests", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_feature_requests_user_id"), table_name="feature_requests")
    op.drop_index(op.f("ix_feature_requests_status"), table_name="feature_requests")
    op.drop_index(op.f("ix_feature_requests_payment_reference"), table_name="feature_requests")
    op.drop_index(op.f("ix_feature_requests_listing_id"), table_name="feature_requests")
    op.drop_table("feature_requests")

    with op.batch_alter_table("messages") as batch:
        batch.drop_column("notification_email_sent_at")
    with op.batch_alter_table("listings") as batch:
        batch.drop_column("expiry_notice_sent_at")
    with op.batch_alter_table("conversations") as batch:
        batch.drop_column("seller_message_email_sent_at")
        batch.drop_column("buyer_message_email_sent_at")
    with op.batch_alter_table("user_profiles") as batch:
        batch.drop_column("notify_listing_expiry")
        batch.drop_column("notify_saved_searches")
        batch.drop_column("notify_messages")
    op.drop_index(op.f("ix_users_email_unsubscribe_token_hash"), table_name="users")
    with op.batch_alter_table("users") as batch:
        batch.drop_column("email_unsubscribe_token_hash")
