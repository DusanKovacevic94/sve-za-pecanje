"""promotion orders

Revision ID: 0006_promotion_orders
Revises: 0005_p3_feature_notifications
Create Date: 2026-07-07 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0006_promotion_orders"
down_revision = "0005_p3_feature_notifications"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("listings") as batch:
        batch.add_column(sa.Column("bumped_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f("ix_listings_bumped_at"), "listings", ["bumped_at"], unique=False)

    op.drop_index(op.f("ix_feature_requests_listing_id"), table_name="feature_requests")
    op.drop_index(op.f("ix_feature_requests_payment_reference"), table_name="feature_requests")
    op.drop_index(op.f("ix_feature_requests_status"), table_name="feature_requests")
    op.drop_index(op.f("ix_feature_requests_user_id"), table_name="feature_requests")
    op.rename_table("feature_requests", "promotion_orders")
    with op.batch_alter_table("promotion_orders") as batch:
        batch.add_column(sa.Column("type", sa.String(length=30), nullable=False, server_default="featured"))
        batch.add_column(sa.Column("starts_at", sa.DateTime(timezone=True), nullable=True))
        batch.add_column(sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f("ix_promotion_orders_listing_id"), "promotion_orders", ["listing_id"], unique=False)
    op.create_index(
        op.f("ix_promotion_orders_payment_reference"),
        "promotion_orders",
        ["payment_reference"],
        unique=True,
    )
    op.create_index(op.f("ix_promotion_orders_status"), "promotion_orders", ["status"], unique=False)
    op.create_index(op.f("ix_promotion_orders_type"), "promotion_orders", ["type"], unique=False)
    op.create_index(op.f("ix_promotion_orders_user_id"), "promotion_orders", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_promotion_orders_user_id"), table_name="promotion_orders")
    op.drop_index(op.f("ix_promotion_orders_type"), table_name="promotion_orders")
    op.drop_index(op.f("ix_promotion_orders_status"), table_name="promotion_orders")
    op.drop_index(op.f("ix_promotion_orders_payment_reference"), table_name="promotion_orders")
    op.drop_index(op.f("ix_promotion_orders_listing_id"), table_name="promotion_orders")
    with op.batch_alter_table("promotion_orders") as batch:
        batch.drop_column("ends_at")
        batch.drop_column("starts_at")
        batch.drop_column("type")
    op.rename_table("promotion_orders", "feature_requests")
    op.create_index(op.f("ix_feature_requests_listing_id"), "feature_requests", ["listing_id"], unique=False)
    op.create_index(
        op.f("ix_feature_requests_payment_reference"),
        "feature_requests",
        ["payment_reference"],
        unique=True,
    )
    op.create_index(op.f("ix_feature_requests_status"), "feature_requests", ["status"], unique=False)
    op.create_index(op.f("ix_feature_requests_user_id"), "feature_requests", ["user_id"], unique=False)

    op.drop_index(op.f("ix_listings_bumped_at"), table_name="listings")
    with op.batch_alter_table("listings") as batch:
        batch.drop_column("bumped_at")
