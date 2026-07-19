"""listing drafts and optimistic autosave

Revision ID: 0012_listing_drafts
Revises: 0011_adaptive_anti_abuse
Create Date: 2026-07-19 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision = "0012_listing_drafts"
down_revision = "0011_adaptive_anti_abuse"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("listings") as batch:
        batch.add_column(sa.Column("draft_client_id", sa.String(length=100), nullable=True))
        batch.add_column(
            sa.Column(
                "draft_version",
                sa.Integer(),
                nullable=False,
                server_default="0",
            )
        )
        batch.add_column(
            sa.Column("draft_last_saved_at", sa.DateTime(timezone=True), nullable=True)
        )
        batch.create_index(
            batch.f("ix_listings_draft_last_saved_at"),
            ["draft_last_saved_at"],
        )
        batch.create_unique_constraint(
            "uq_listing_seller_draft_client",
            ["seller_id", "draft_client_id"],
        )


def downgrade() -> None:
    with op.batch_alter_table("listings") as batch:
        batch.drop_constraint("uq_listing_seller_draft_client", type_="unique")
        batch.drop_index(batch.f("ix_listings_draft_last_saved_at"))
        batch.drop_column("draft_last_saved_at")
        batch.drop_column("draft_version")
        batch.drop_column("draft_client_id")
