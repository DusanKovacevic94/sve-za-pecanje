from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, uuid_pk


class PhoneVerificationChallenge(Base, TimestampMixin):
    __tablename__ = "phone_verification_challenges"
    __table_args__ = (
        Index(
            "ix_phone_verification_user_created",
            "user_id",
            "created_at",
        ),
        Index(
            "ix_phone_verification_number_created",
            "phone_e164",
            "created_at",
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_pk)
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    phone_e164: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    code_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )
    attempt_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    resend_available_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    consumed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        index=True,
    )
    provider_reference: Mapped[str | None] = mapped_column(String(160))
