"""search full text

Revision ID: 0004_search_fulltext
Revises: 0003_p2_worker_outbox
Create Date: 2026-07-06 00:00:00.000000
"""

from alembic import op


revision = "0004_search_fulltext"
down_revision = "0003_p2_worker_outbox"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.execute("CREATE EXTENSION IF NOT EXISTS unaccent")
    op.execute("ALTER TABLE listings ADD COLUMN IF NOT EXISTS search_vector tsvector")
    op.execute(
        """
        CREATE OR REPLACE FUNCTION listings_search_vector_update()
        RETURNS trigger AS $$
        BEGIN
          NEW.search_vector :=
            setweight(to_tsvector('simple', unaccent(coalesce(NEW.title, ''))), 'A') ||
            setweight(to_tsvector('simple', unaccent(coalesce(NEW.description, ''))), 'B');
          RETURN NEW;
        END
        $$ LANGUAGE plpgsql
        """
    )
    op.execute(
        """
        UPDATE listings
        SET search_vector =
          setweight(to_tsvector('simple', unaccent(coalesce(title, ''))), 'A') ||
          setweight(to_tsvector('simple', unaccent(coalesce(description, ''))), 'B')
        """
    )
    op.execute(
        """
        DROP TRIGGER IF EXISTS listings_search_vector_trigger ON listings;
        CREATE TRIGGER listings_search_vector_trigger
        BEFORE INSERT OR UPDATE OF title, description ON listings
        FOR EACH ROW EXECUTE FUNCTION listings_search_vector_update()
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_listings_search_vector ON listings USING GIN (search_vector)"
    )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    op.execute("DROP INDEX IF EXISTS ix_listings_search_vector")
    op.execute("DROP TRIGGER IF EXISTS listings_search_vector_trigger ON listings")
    op.execute("DROP FUNCTION IF EXISTS listings_search_vector_update")
    op.execute("ALTER TABLE listings DROP COLUMN IF EXISTS search_vector")
