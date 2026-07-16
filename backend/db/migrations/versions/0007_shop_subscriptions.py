"""shop subscriptions

Revision ID: 0007_shop_subscriptions
Revises: 0006_promotion_orders
Create Date: 2026-07-07 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision = "0007_shop_subscriptions"
down_revision = "0006_promotion_orders"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("user_profiles") as batch:
        batch.add_column(sa.Column("shop_name", sa.String(length=160), nullable=True))
        batch.add_column(sa.Column("shop_slug", sa.String(length=180), nullable=True))
        batch.add_column(sa.Column("shop_logo_url", sa.String(length=500), nullable=True))
        batch.add_column(sa.Column("shop_description", sa.Text(), nullable=True))
        batch.add_column(sa.Column("shop_tax_id", sa.String(length=40), nullable=True))
        batch.add_column(sa.Column("shop_registration_number", sa.String(length=40), nullable=True))
        batch.add_column(sa.Column("shop_active_until", sa.DateTime(timezone=True), nullable=True))
        batch.add_column(sa.Column("shop_expiry_notice_sent_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f("ix_user_profiles_shop_name"), "user_profiles", ["shop_name"], unique=False)
    op.create_index(op.f("ix_user_profiles_shop_slug"), "user_profiles", ["shop_slug"], unique=True)
    op.create_index(op.f("ix_user_profiles_shop_active_until"), "user_profiles", ["shop_active_until"], unique=False)

    op.create_table(
        "shop_subscription_requests",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("plan", sa.String(length=30), nullable=False),
        sa.Column("price_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("payment_reference", sa.String(length=50), nullable=False),
        sa.Column("admin_note", sa.Text(), nullable=True),
        sa.Column("activated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_by_admin_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["resolved_by_admin_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_shop_subscription_requests_user_id"), "shop_subscription_requests", ["user_id"], unique=False)
    op.create_index(op.f("ix_shop_subscription_requests_plan"), "shop_subscription_requests", ["plan"], unique=False)
    op.create_index(op.f("ix_shop_subscription_requests_status"), "shop_subscription_requests", ["status"], unique=False)
    op.create_index(
        op.f("ix_shop_subscription_requests_payment_reference"),
        "shop_subscription_requests",
        ["payment_reference"],
        unique=True,
    )
    op.create_index(op.f("ix_shop_subscription_requests_ends_at"), "shop_subscription_requests", ["ends_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_shop_subscription_requests_ends_at"), table_name="shop_subscription_requests")
    op.drop_index(op.f("ix_shop_subscription_requests_payment_reference"), table_name="shop_subscription_requests")
    op.drop_index(op.f("ix_shop_subscription_requests_status"), table_name="shop_subscription_requests")
    op.drop_index(op.f("ix_shop_subscription_requests_plan"), table_name="shop_subscription_requests")
    op.drop_index(op.f("ix_shop_subscription_requests_user_id"), table_name="shop_subscription_requests")
    op.drop_table("shop_subscription_requests")

    op.drop_index(op.f("ix_user_profiles_shop_active_until"), table_name="user_profiles")
    op.drop_index(op.f("ix_user_profiles_shop_slug"), table_name="user_profiles")
    op.drop_index(op.f("ix_user_profiles_shop_name"), table_name="user_profiles")
    with op.batch_alter_table("user_profiles") as batch:
        batch.drop_column("shop_expiry_notice_sent_at")
        batch.drop_column("shop_active_until")
        batch.drop_column("shop_registration_number")
        batch.drop_column("shop_tax_id")
        batch.drop_column("shop_description")
        batch.drop_column("shop_logo_url")
        batch.drop_column("shop_slug")
        batch.drop_column("shop_name")
