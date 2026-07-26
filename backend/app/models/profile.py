from __future__ import annotations

from typing import TYPE_CHECKING

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, uuid_pk

if TYPE_CHECKING:
    from app.models.user import User


class UserProfile(Base, TimestampMixin):
    __tablename__ = "user_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_pk)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    display_name: Mapped[str | None] = mapped_column(String(120))
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    city: Mapped[str | None] = mapped_column(String(120), index=True)
    municipality: Mapped[str | None] = mapped_column(String(120))
    phone_number: Mapped[str | None] = mapped_column(String(16), index=True)
    phone_number_display: Mapped[str | None] = mapped_column(String(40))
    phone_verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        index=True,
    )
    phone_visible: Mapped[bool] = mapped_column(Boolean, default=False)
    bio: Mapped[str | None] = mapped_column(Text)
    fishing_styles: Mapped[list[str]] = mapped_column(JSON, default=list)
    member_badges: Mapped[list[str]] = mapped_column(JSON, default=list)
    shop_name: Mapped[str | None] = mapped_column(String(160), index=True)
    shop_slug: Mapped[str | None] = mapped_column(String(180), unique=True, index=True)
    shop_logo_url: Mapped[str | None] = mapped_column(String(500))
    shop_description: Mapped[str | None] = mapped_column(Text)
    shop_tax_id: Mapped[str | None] = mapped_column(String(40))
    shop_registration_number: Mapped[str | None] = mapped_column(String(40))
    shop_active_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    shop_expiry_notice_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notify_messages: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_saved_searches: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_listing_expiry: Mapped[bool] = mapped_column(Boolean, default=True)

    user: Mapped["User"] = relationship(back_populates="profile")
