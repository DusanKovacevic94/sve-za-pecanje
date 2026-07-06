"""auth hardening

Revision ID: 0002_auth_hardening
Revises: 0001_initial
Create Date: 2026-07-06 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0002_auth_hardening"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "auth_sessions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("user_agent", sa.String(length=300), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_auth_sessions_expires_at"), "auth_sessions", ["expires_at"], unique=False)
    op.create_index(op.f("ix_auth_sessions_revoked_at"), "auth_sessions", ["revoked_at"], unique=False)
    op.create_index(op.f("ix_auth_sessions_user_id"), "auth_sessions", ["user_id"], unique=False)

    op.drop_index(op.f("ix_users_email_verification_token"), table_name="users")
    op.drop_index(op.f("ix_users_password_reset_token"), table_name="users")
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("email_verification_token_hash", sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column("email_verification_expires_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("password_reset_token_hash", sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column("password_reset_expires_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.drop_column("email_verification_token")
        batch_op.drop_column("password_reset_token")
    op.create_index(op.f("ix_users_email_verification_token_hash"), "users", ["email_verification_token_hash"], unique=False)
    op.create_index(op.f("ix_users_password_reset_token_hash"), "users", ["password_reset_token_hash"], unique=False)

    with op.batch_alter_table("user_profiles") as batch_op:
        batch_op.alter_column("phone_number_encrypted", new_column_name="phone_number")


def downgrade() -> None:
    with op.batch_alter_table("user_profiles") as batch_op:
        batch_op.alter_column("phone_number", new_column_name="phone_number_encrypted")

    op.drop_index(op.f("ix_users_password_reset_token_hash"), table_name="users")
    op.drop_index(op.f("ix_users_email_verification_token_hash"), table_name="users")
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("password_reset_token", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("email_verification_token", sa.String(length=255), nullable=True))
        batch_op.drop_column("password_reset_expires_at")
        batch_op.drop_column("password_reset_token_hash")
        batch_op.drop_column("email_verification_expires_at")
        batch_op.drop_column("email_verification_token_hash")
    op.create_index(op.f("ix_users_password_reset_token"), "users", ["password_reset_token"], unique=False)
    op.create_index(op.f("ix_users_email_verification_token"), "users", ["email_verification_token"], unique=False)

    op.drop_index(op.f("ix_auth_sessions_user_id"), table_name="auth_sessions")
    op.drop_index(op.f("ix_auth_sessions_revoked_at"), table_name="auth_sessions")
    op.drop_index(op.f("ix_auth_sessions_expires_at"), table_name="auth_sessions")
    op.drop_table("auth_sessions")
