"""search discovery suggestions and privacy-safe popular queries

Revision ID: 0014_search_discovery
Revises: 0013_listing_handoff_options
Create Date: 2026-07-24 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision = "0014_search_discovery"
down_revision = "0013_listing_handoff_options"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "popular_search_queries",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("query_normalized", sa.String(length=160), nullable=False),
        sa.Column("search_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("distinct_user_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("window_started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("refreshed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_popular_search_queries_query_normalized"),
        "popular_search_queries",
        ["query_normalized"],
        unique=True,
    )
    op.create_index(
        op.f("ix_popular_search_queries_refreshed_at"),
        "popular_search_queries",
        ["refreshed_at"],
    )
    op.create_table(
        "search_query_blacklist",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("term_normalized", sa.String(length=160), nullable=False),
        sa.Column(
            "created_by_admin_id",
            sa.String(length=36),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_search_query_blacklist_term_normalized"),
        "search_query_blacklist",
        ["term_normalized"],
        unique=True,
    )
    op.create_index(
        op.f("ix_search_query_blacklist_created_by_admin_id"),
        "search_query_blacklist",
        ["created_by_admin_id"],
    )
    op.create_table(
        "search_discovery_state",
        sa.Column("id", sa.String(length=40), nullable=False),
        sa.Column("refreshed_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
        op.execute(
            """
            CREATE OR REPLACE FUNCTION immutable_unaccent(text)
            RETURNS text
            LANGUAGE sql
            IMMUTABLE
            PARALLEL SAFE
            AS $$
              SELECT public.unaccent('public.unaccent', $1)
            $$
            """
        )
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_categories_name_sr_trgm "
            "ON categories USING GIN (lower(immutable_unaccent(name_sr)) gin_trgm_ops)"
        )
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_brands_name_trgm "
            "ON brands USING GIN (lower(immutable_unaccent(name)) gin_trgm_ops)"
        )
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_listings_title_trgm "
            "ON listings USING GIN (lower(immutable_unaccent(title)) gin_trgm_ops)"
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP INDEX IF EXISTS ix_listings_title_trgm")
        op.execute("DROP INDEX IF EXISTS ix_brands_name_trgm")
        op.execute("DROP INDEX IF EXISTS ix_categories_name_sr_trgm")
        op.execute("DROP FUNCTION IF EXISTS immutable_unaccent(text)")
    op.drop_table("search_discovery_state")
    op.drop_index(
        op.f("ix_search_query_blacklist_created_by_admin_id"),
        table_name="search_query_blacklist",
    )
    op.drop_index(
        op.f("ix_search_query_blacklist_term_normalized"),
        table_name="search_query_blacklist",
    )
    op.drop_table("search_query_blacklist")
    op.drop_index(
        op.f("ix_popular_search_queries_refreshed_at"),
        table_name="popular_search_queries",
    )
    op.drop_index(
        op.f("ix_popular_search_queries_query_normalized"),
        table_name="popular_search_queries",
    )
    op.drop_table("popular_search_queries")
