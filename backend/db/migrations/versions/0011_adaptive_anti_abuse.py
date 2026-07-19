"""adaptive anti-abuse and moderation cases

Revision ID: 0011_adaptive_anti_abuse
Revises: 0010_marketplace_analytics
Create Date: 2026-07-19 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision = "0011_adaptive_anti_abuse"
down_revision = "0010_marketplace_analytics"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("listing_images") as batch:
        batch.add_column(sa.Column("content_hash", sa.String(length=64), nullable=True))
        batch.create_index(batch.f("ix_listing_images_content_hash"), ["content_hash"])

    op.create_table(
        "moderation_cases",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("entity_type", sa.String(length=40), nullable=False),
        sa.Column("entity_id", sa.String(length=80), nullable=False),
        sa.Column("subject_user_id", sa.String(length=36), nullable=True),
        sa.Column("risk_score", sa.Integer(), nullable=False),
        sa.Column("reason_codes", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("assigned_admin_id", sa.String(length=36), nullable=True),
        sa.Column("internal_notes", sa.Text(), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["assigned_admin_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["subject_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    for column in [
        "entity_type",
        "entity_id",
        "subject_user_id",
        "risk_score",
        "status",
        "assigned_admin_id",
        "resolved_at",
    ]:
        op.create_index(op.f(f"ix_moderation_cases_{column}"), "moderation_cases", [column])

    op.create_table(
        "abuse_signals",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("signal_type", sa.String(length=80), nullable=False),
        sa.Column("actor_user_id", sa.String(length=36), nullable=True),
        sa.Column("network_hash", sa.String(length=64), nullable=True),
        sa.Column("entity_type", sa.String(length=40), nullable=True),
        sa.Column("entity_id", sa.String(length=80), nullable=True),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    for column in [
        "signal_type",
        "actor_user_id",
        "network_hash",
        "entity_type",
        "entity_id",
        "expires_at",
    ]:
        op.create_index(op.f(f"ix_abuse_signals_{column}"), "abuse_signals", [column])

    op.create_table(
        "listing_fingerprints",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("listing_id", sa.String(length=36), nullable=False),
        sa.Column("seller_id", sa.String(length=36), nullable=False),
        sa.Column("content_hash", sa.String(length=64), nullable=False),
        sa.Column("image_hashes", sa.JSON(), nullable=False),
        sa.Column("combined_hash", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["listing_id"], ["listings.id"]),
        sa.ForeignKeyConstraint(["seller_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_listing_fingerprints_listing_id"), "listing_fingerprints", ["listing_id"], unique=True)
    op.create_index(op.f("ix_listing_fingerprints_seller_id"), "listing_fingerprints", ["seller_id"])
    op.create_index(op.f("ix_listing_fingerprints_content_hash"), "listing_fingerprints", ["content_hash"])
    op.create_index(op.f("ix_listing_fingerprints_combined_hash"), "listing_fingerprints", ["combined_hash"])


def downgrade() -> None:
    op.drop_table("listing_fingerprints")
    op.drop_table("abuse_signals")
    op.drop_table("moderation_cases")
    with op.batch_alter_table("listing_images") as batch:
        batch.drop_index(batch.f("ix_listing_images_content_hash"))
        batch.drop_column("content_hash")
