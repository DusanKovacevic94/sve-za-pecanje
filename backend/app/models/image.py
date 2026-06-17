from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, uuid_pk

if TYPE_CHECKING:
    from app.models.listing import Listing


class ListingImage(Base):
    __tablename__ = "listing_images"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_pk)
    listing_id: Mapped[str] = mapped_column(ForeignKey("listings.id"), index=True)
    storage_key: Mapped[str] = mapped_column(String(500))
    url: Mapped[str] = mapped_column(String(500))
    original_filename: Mapped[str | None] = mapped_column(String(255))
    content_type: Mapped[str] = mapped_column(String(80))
    width: Mapped[int | None] = mapped_column()
    height: Mapped[int | None] = mapped_column()
    size_bytes: Mapped[int | None] = mapped_column()
    sort_order: Mapped[int] = mapped_column(default=0)
    is_cover: Mapped[bool] = mapped_column(Boolean, default=False)

    listing: Mapped["Listing"] = relationship(back_populates="images")
