"""marketplace analytics and daily rollups

Revision ID: 0010_marketplace_analytics
Revises: 0009_leaf_category_taxonomy
Create Date: 2026-07-18 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision = "0010_marketplace_analytics"
down_revision = "0009_leaf_category_taxonomy"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("analytics_events") as batch:
        batch.add_column(sa.Column("client_event_id", sa.String(length=80), nullable=True))
        batch.add_column(sa.Column("category_id", sa.String(length=36), nullable=True))
    op.create_index(
        op.f("ix_analytics_events_client_event_id"),
        "analytics_events",
        ["client_event_id"],
        unique=True,
    )
    op.create_index(
        op.f("ix_analytics_events_category_id"),
        "analytics_events",
        ["category_id"],
        unique=False,
    )

    op.create_table(
        "marketplace_metrics_daily",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("metric_date", sa.Date(), nullable=False),
        sa.Column("category_key", sa.String(length=36), nullable=False),
        sa.Column("active_listings", sa.Integer(), nullable=False),
        sa.Column("new_approved_listings", sa.Integer(), nullable=False),
        sa.Column("unique_active_sellers", sa.Integer(), nullable=False),
        sa.Column("listings_with_three_images", sa.Integer(), nullable=False),
        sa.Column("searches", sa.Integer(), nullable=False),
        sa.Column("zero_result_searches", sa.Integer(), nullable=False),
        sa.Column("listing_views", sa.Integer(), nullable=False),
        sa.Column("conversations_started", sa.Integer(), nullable=False),
        sa.Column("sold_listings", sa.Integer(), nullable=False),
        sa.Column("sold_within_30_days", sa.Integer(), nullable=False),
        sa.Column("median_days_to_sale", sa.Numeric(precision=8, scale=2), nullable=True),
        sa.Column("reports", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "metric_date",
            "category_key",
            name="uq_marketplace_metric_date_category",
        ),
    )
    op.create_index(
        op.f("ix_marketplace_metrics_daily_metric_date"),
        "marketplace_metrics_daily",
        ["metric_date"],
        unique=False,
    )
    op.create_index(
        op.f("ix_marketplace_metrics_daily_category_key"),
        "marketplace_metrics_daily",
        ["category_key"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_marketplace_metrics_daily_category_key"),
        table_name="marketplace_metrics_daily",
    )
    op.drop_index(
        op.f("ix_marketplace_metrics_daily_metric_date"),
        table_name="marketplace_metrics_daily",
    )
    op.drop_table("marketplace_metrics_daily")

    op.drop_index(op.f("ix_analytics_events_category_id"), table_name="analytics_events")
    op.drop_index(op.f("ix_analytics_events_client_event_id"), table_name="analytics_events")
    with op.batch_alter_table("analytics_events") as batch:
        batch.drop_column("category_id")
        batch.drop_column("client_event_id")
