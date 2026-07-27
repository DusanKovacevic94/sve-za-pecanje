from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, uuid_pk

PUBLIC_LISTING_STATUSES = ("active", "reserved")
PRICE_TYPES = ("fixed", "negotiable", "on_request", "free")
DELIVERY_METHODS = ("personal_pickup", "courier", "seller_arrangement")

if TYPE_CHECKING:
    from app.models.brand import Brand
    from app.models.category import Category
    from app.models.image import ListingImage
    from app.models.user import User


class Listing(Base, TimestampMixin):
    __tablename__ = "listings"
    __table_args__ = (
        Index("ix_listings_public_id", "public_id", unique=True),
        Index("ix_listings_slug", "slug", unique=True),
        UniqueConstraint(
            "seller_id",
            "draft_client_id",
            name="uq_listing_seller_draft_client",
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_pk)
    public_id: Mapped[str] = mapped_column(String(18))
    seller_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    category_id: Mapped[str] = mapped_column(ForeignKey("categories.id"), index=True)
    brand_id: Mapped[str | None] = mapped_column(ForeignKey("brands.id"), index=True)
    brand_name_custom: Mapped[str | None] = mapped_column(String(120))
    model: Mapped[str | None] = mapped_column(String(120))
    title: Mapped[str] = mapped_column(String(120), index=True)
    slug: Mapped[str] = mapped_column(String(180))
    description: Mapped[str] = mapped_column(Text)
    condition: Mapped[str] = mapped_column(String(40), index=True)
    price_type: Mapped[str] = mapped_column(String(30), default="fixed", index=True)
    price_amount: Mapped[float | None] = mapped_column(Numeric(12, 2), index=True)
    currency: Mapped[str] = mapped_column(String(3), index=True, default="RSD")
    delivery_methods: Mapped[list[str]] = mapped_column(
        JSONB().with_variant(JSON, "sqlite"),
        default=list,
    )
    delivery_note: Mapped[str | None] = mapped_column(Text)
    city: Mapped[str] = mapped_column(String(120), index=True)
    municipality: Mapped[str | None] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(30), default="pending_review", index=True)
    attributes: Mapped[dict] = mapped_column(
        JSONB().with_variant(JSON, "sqlite"),
        default=dict,
    )
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
    reserved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    reserved_by_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    rejection_reason: Mapped[str | None] = mapped_column(Text)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    approved_by_admin_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expiry_notice_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    draft_client_id: Mapped[str | None] = mapped_column(String(100))
    draft_version: Mapped[int] = mapped_column(Integer, default=0)
    draft_last_saved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)

    seller: Mapped["User"] = relationship(foreign_keys=[seller_id], back_populates="listings")
    category: Mapped["Category"] = relationship()
    brand: Mapped["Brand | None"] = relationship()
    images: Mapped[list["ListingImage"]] = relationship(
        back_populates="listing", cascade="all, delete-orphan", order_by="ListingImage.sort_order"
    )
