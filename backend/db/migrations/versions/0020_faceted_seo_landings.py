"""curated faceted SEO landing pages

Revision ID: 0020_faceted_seo_landings
Revises: 0019_seller_following
Create Date: 2026-07-27 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision = "0020_faceted_seo_landings"
down_revision = "0019_seller_following"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "seo_landing_pages",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("scope_key", sa.String(length=80), nullable=False),
        sa.Column("category_id", sa.String(length=36), nullable=False),
        sa.Column("brand_id", sa.String(length=36), nullable=True),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("meta_description", sa.String(length=320), nullable=False),
        sa.Column("intro_copy", sa.Text(), nullable=False),
        sa.Column(
            "indexing_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
        sa.Column(
            "minimum_active_listings",
            sa.Integer(),
            nullable=False,
            server_default="3",
        ),
        sa.Column(
            "threshold_override",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column("override_reason", sa.Text(), nullable=True),
        sa.Column("updated_by_admin_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["brand_id"],
            ["brands.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["category_id"],
            ["categories.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["updated_by_admin_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("scope_key"),
    )
    op.create_index(
        op.f("ix_seo_landing_pages_scope_key"),
        "seo_landing_pages",
        ["scope_key"],
        unique=True,
    )
    op.create_index(
        op.f("ix_seo_landing_pages_category_id"),
        "seo_landing_pages",
        ["category_id"],
    )
    op.create_index(
        op.f("ix_seo_landing_pages_brand_id"),
        "seo_landing_pages",
        ["brand_id"],
    )
    op.create_index(
        op.f("ix_seo_landing_pages_updated_by_admin_id"),
        "seo_landing_pages",
        ["updated_by_admin_id"],
    )
    op.create_index(
        "ix_seo_landing_category_brand",
        "seo_landing_pages",
        ["category_id", "brand_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_seo_landing_category_brand",
        table_name="seo_landing_pages",
    )
    op.drop_index(
        op.f("ix_seo_landing_pages_updated_by_admin_id"),
        table_name="seo_landing_pages",
    )
    op.drop_index(
        op.f("ix_seo_landing_pages_brand_id"),
        table_name="seo_landing_pages",
    )
    op.drop_index(
        op.f("ix_seo_landing_pages_category_id"),
        table_name="seo_landing_pages",
    )
    op.drop_index(
        op.f("ix_seo_landing_pages_scope_key"),
        table_name="seo_landing_pages",
    )
    op.drop_table("seo_landing_pages")
