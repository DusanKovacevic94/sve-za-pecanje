"""listing price, delivery, and reservation options

Revision ID: 0013_listing_handoff_options
Revises: 0012_listing_drafts
Create Date: 2026-07-20 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0013_listing_handoff_options"
down_revision = "0012_listing_drafts"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("listings") as batch:
        batch.add_column(
            sa.Column(
                "price_type",
                sa.String(length=30),
                nullable=False,
                server_default="fixed",
            )
        )
        batch.add_column(
            sa.Column(
                "delivery_methods",
                postgresql.JSONB().with_variant(sa.JSON(), "sqlite"),
                nullable=False,
                server_default=sa.text("'[]'"),
            )
        )
        batch.add_column(sa.Column("delivery_note", sa.Text(), nullable=True))
        batch.add_column(
            sa.Column("reserved_at", sa.DateTime(timezone=True), nullable=True)
        )
        batch.add_column(
            sa.Column("reserved_by_user_id", sa.String(length=36), nullable=True)
        )
        batch.alter_column(
            "price_amount",
            existing_type=sa.Numeric(precision=12, scale=2),
            nullable=True,
        )
        batch.create_index(batch.f("ix_listings_price_type"), ["price_type"])
        batch.create_index(batch.f("ix_listings_reserved_at"), ["reserved_at"])
        batch.create_foreign_key(
            "fk_listings_reserved_by_user_id_users",
            "users",
            ["reserved_by_user_id"],
            ["id"],
        )

    op.execute(sa.text("UPDATE listings SET price_type = 'fixed'"))


def downgrade() -> None:
    op.execute(
        sa.text(
            "UPDATE listings SET price_amount = 0 "
            "WHERE price_amount IS NULL"
        )
    )
    with op.batch_alter_table("listings") as batch:
        batch.drop_constraint(
            "fk_listings_reserved_by_user_id_users",
            type_="foreignkey",
        )
        batch.drop_index(batch.f("ix_listings_reserved_at"))
        batch.drop_index(batch.f("ix_listings_price_type"))
        batch.alter_column(
            "price_amount",
            existing_type=sa.Numeric(precision=12, scale=2),
            nullable=False,
        )
        batch.drop_column("reserved_by_user_id")
        batch.drop_column("reserved_at")
        batch.drop_column("delivery_note")
        batch.drop_column("delivery_methods")
        batch.drop_column("price_type")
