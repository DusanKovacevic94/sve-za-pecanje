from sqlalchemy import Boolean, Index, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, uuid_pk


class Brand(Base, TimestampMixin):
    __tablename__ = "brands"
    __table_args__ = (Index("ix_brands_slug", "slug", unique=True),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_pk)
    name: Mapped[str] = mapped_column(String(120), index=True)
    slug: Mapped[str] = mapped_column(String(140))
    aliases: Mapped[list[str]] = mapped_column(JSON, default=list)
    category_scope: Mapped[list[str]] = mapped_column(JSON, default=list)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=True)
