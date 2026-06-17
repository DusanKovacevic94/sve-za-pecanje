from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, uuid_pk


class Report(Base, TimestampMixin):
    __tablename__ = "reports"
    __table_args__ = (UniqueConstraint("reporter_id", "listing_id", name="uq_reporter_listing"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_pk)
    reporter_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    listing_id: Mapped[str | None] = mapped_column(ForeignKey("listings.id"), index=True)
    reported_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), index=True)
    reason: Mapped[str] = mapped_column(String(60))
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(40), default="open", index=True)
    resolved_by_admin_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    resolution_note: Mapped[str | None] = mapped_column(Text)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

