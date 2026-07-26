"""phone verification challenges and trust signals

Revision ID: 0016_phone_verification_trust
Revises: 0015_in_app_notifications
Create Date: 2026-07-26 00:00:00.000000
"""

import re
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision = "0016_phone_verification_trust"
down_revision = "0015_in_app_notifications"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _normalize_existing(value: str) -> str | None:
    compact = re.sub(r"[\s()./-]", "", value.strip())
    if compact.startswith("00"):
        compact = f"+{compact[2:]}"
    elif compact.startswith("0"):
        compact = f"+381{compact[1:]}"
    elif compact.startswith("381"):
        compact = f"+{compact}"
    return compact if re.fullmatch(r"\+[1-9]\d{7,14}", compact) else None


def upgrade() -> None:
    with op.batch_alter_table("user_profiles") as batch:
        batch.add_column(
            sa.Column("phone_number_display", sa.String(length=40), nullable=True)
        )
        batch.add_column(
            sa.Column(
                "phone_verified_at",
                sa.DateTime(timezone=True),
                nullable=True,
            )
        )
        batch.create_index(
            op.f("ix_user_profiles_phone_verified_at"),
            ["phone_verified_at"],
        )

    bind = op.get_bind()
    rows = bind.execute(
        sa.text(
            "SELECT id, phone_number FROM user_profiles "
            "WHERE phone_number IS NOT NULL"
        )
    ).mappings()
    for row in rows:
        raw = str(row["phone_number"])
        normalized = _normalize_existing(raw)
        bind.execute(
            sa.text(
                "UPDATE user_profiles "
                "SET phone_number = :normalized, "
                "phone_number_display = :display, "
                "phone_visible = CASE WHEN :normalized IS NULL "
                "THEN 0 ELSE phone_visible END "
                "WHERE id = :id"
            ),
            {
                "normalized": normalized,
                "display": " ".join(raw.strip().split())[:40] or None,
                "id": row["id"],
            },
        )

    with op.batch_alter_table("user_profiles") as batch:
        batch.alter_column(
            "phone_number",
            existing_type=sa.String(length=255),
            type_=sa.String(length=16),
            existing_nullable=True,
        )
        batch.create_index(
            op.f("ix_user_profiles_phone_number"),
            ["phone_number"],
        )

    op.create_table(
        "phone_verification_challenges",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("phone_e164", sa.String(length=16), nullable=False),
        sa.Column("code_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_sent_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "resend_available_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("provider_reference", sa.String(length=160), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_phone_verification_challenges_user_id"),
        "phone_verification_challenges",
        ["user_id"],
    )
    op.create_index(
        op.f("ix_phone_verification_challenges_phone_e164"),
        "phone_verification_challenges",
        ["phone_e164"],
    )
    op.create_index(
        op.f("ix_phone_verification_challenges_expires_at"),
        "phone_verification_challenges",
        ["expires_at"],
    )
    op.create_index(
        op.f("ix_phone_verification_challenges_consumed_at"),
        "phone_verification_challenges",
        ["consumed_at"],
    )
    op.create_index(
        "ix_phone_verification_user_created",
        "phone_verification_challenges",
        ["user_id", "created_at"],
    )
    op.create_index(
        "ix_phone_verification_number_created",
        "phone_verification_challenges",
        ["phone_e164", "created_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_phone_verification_number_created",
        table_name="phone_verification_challenges",
    )
    op.drop_index(
        "ix_phone_verification_user_created",
        table_name="phone_verification_challenges",
    )
    op.drop_index(
        op.f("ix_phone_verification_challenges_consumed_at"),
        table_name="phone_verification_challenges",
    )
    op.drop_index(
        op.f("ix_phone_verification_challenges_expires_at"),
        table_name="phone_verification_challenges",
    )
    op.drop_index(
        op.f("ix_phone_verification_challenges_phone_e164"),
        table_name="phone_verification_challenges",
    )
    op.drop_index(
        op.f("ix_phone_verification_challenges_user_id"),
        table_name="phone_verification_challenges",
    )
    op.drop_table("phone_verification_challenges")
    with op.batch_alter_table("user_profiles") as batch:
        batch.drop_index(op.f("ix_user_profiles_phone_verified_at"))
        batch.drop_index(op.f("ix_user_profiles_phone_number"))
        batch.drop_column("phone_verified_at")
        batch.drop_column("phone_number_display")
        batch.alter_column(
            "phone_number",
            existing_type=sa.String(length=16),
            type_=sa.String(length=255),
            existing_nullable=True,
        )
