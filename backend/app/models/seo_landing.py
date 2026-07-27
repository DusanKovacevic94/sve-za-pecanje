from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, uuid_pk

if TYPE_CHECKING:
    from app.models.brand import Brand
    from app.models.category import Category


class SeoLandingPage(Base, TimestampMixin):
    __tablename__ = "seo_landing_pages"
    __table_args__ = (
        Index(
            "ix_seo_landing_category_brand",
            "category_id",
            "brand_id",
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_pk)
    scope_key: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    category_id: Mapped[str] = mapped_column(
        ForeignKey("categories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    brand_id: Mapped[str | None] = mapped_column(
        ForeignKey("brands.id", ondelete="CASCADE"),
        index=True,
    )
    title: Mapped[str] = mapped_column(String(180))
    meta_description: Mapped[str] = mapped_column(String(320))
    intro_copy: Mapped[str] = mapped_column(Text)
    indexing_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    minimum_active_listings: Mapped[int] = mapped_column(Integer, default=3)
    threshold_override: Mapped[bool] = mapped_column(Boolean, default=False)
    override_reason: Mapped[str | None] = mapped_column(Text)
    updated_by_admin_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
    )

    category: Mapped["Category"] = relationship()
    brand: Mapped["Brand | None"] = relationship()
