"""Alembic exclusions for PostgreSQL objects managed explicitly by migrations.

PostgreSQL expression, full-text, trigram, and JSONB GIN indexes are not represented in
SQLAlchemy model metadata in a form that Alembic can reflect consistently. Every such
index must be registered here and covered by ``test_migration_conventions.py``. Do not add
ordinary model indexes to this list to hide real schema drift.
"""

MANAGED_POSTGRES_INDEXES = frozenset(
    {
        "ix_brands_name_trgm",
        "ix_categories_name_sr_trgm",
        "ix_listings_attributes_gin",
        "ix_listings_search_vector",
        "ix_listings_title_trgm",
    }
)

MANAGED_POSTGRES_COLUMNS = frozenset({"search_vector"})
