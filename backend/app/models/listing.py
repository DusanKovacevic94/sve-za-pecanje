from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, JSON, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, uuid_pk

if TYPE_CHECKING:
    from app.models.brand import Brand
    from app.models.category import Category
    from app.models.image import ListingImage
    from app.models.user import User


class Listing(Base, TimestampMixin):
    __tablename__ = "listings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_pk)
    public_id: Mapped[str] = mapped_column(String(18), unique=True, index=True)
    seller_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    category_id: Mapped[str] = mapped_column(ForeignKey("categories.id"), index=True)
    brand_id: Mapped[str | None] = mapped_column(ForeignKey("brands.id"), index=True)
    brand_name_custom: Mapped[str | None] = mapped_column(String(120))
    model: Mapped[str | None] = mapped_column(String(120))
    title: Mapped[str] = mapped_column(String(120), index=True)
    slug: Mapped[str] = mapped_column(String(180), unique=True, index=True)
    description: Mapped[str] = mapped_column(Text)
    condition: Mapped[str] = mapped_column(String(40), index=True)
    price_amount: Mapped[float] = mapped_column(Numeric(12, 2), index=True)
    currency: Mapped[str] = mapped_column(String(3), index=True, default="RSD")
    city: Mapped[str] = mapped_column(String(120), index=True)
    municipality: Mapped[str | None] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(30), default="pending_review", index=True)
    attributes: Mapped[dict] = mapped_column(JSON, default=dict)
    allow_messages: Mapped[bool] = mapped_column(Boolean, default=True)
    phone_visible: Mapped[bool] = mapped_column(Boolean, default=False)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    featured_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    bumped_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    view_count: Mapped[int] = mapped_column(default=0)
    favorite_count: Mapped[int] = mapped_column(default=0)
    message_count: Mapped[int] = mapped_column(default=0)
    sold_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    sold_to_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    rejection_reason: Mapped[str | None] = mapped_column(Text)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    approved_by_admin_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expiry_notice_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    seller: Mapped["User"] = relationship(foreign_keys=[seller_id], back_populates="listings")
    category: Mapped["Category"] = relationship()
    brand: Mapped["Brand | None"] = relationship()
    images: Mapped[list["ListingImage"]] = relationship(
        back_populates="listing", cascade="all, delete-orphan", order_by="ListingImage.sort_order"
    )
