"""p2 worker outbox

Revision ID: 0003_p2_worker_outbox
Revises: 0002_auth_hardening
Create Date: 2026-07-06 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0003_p2_worker_outbox"
down_revision = "0002_auth_hardening"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "email_outbox",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("to_email", sa.String(length=255), nullable=False),
        sa.Column("subject", sa.String(length=255), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("html", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_email_outbox_next_attempt_at"), "email_outbox", ["next_attempt_at"], unique=False)
    op.create_index(op.f("ix_email_outbox_sent_at"), "email_outbox", ["sent_at"], unique=False)
    op.create_index(op.f("ix_email_outbox_status"), "email_outbox", ["status"], unique=False)
    op.create_index(op.f("ix_email_outbox_to_email"), "email_outbox", ["to_email"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_email_outbox_to_email"), table_name="email_outbox")
    op.drop_index(op.f("ix_email_outbox_status"), table_name="email_outbox")
    op.drop_index(op.f("ix_email_outbox_sent_at"), table_name="email_outbox")
    op.drop_index(op.f("ix_email_outbox_next_attempt_at"), table_name="email_outbox")
    op.drop_table("email_outbox")
