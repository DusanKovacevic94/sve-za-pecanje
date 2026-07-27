from __future__ import annotations

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, uuid_pk


class SellerFollow(Base, TimestampMixin):
    __tablename__ = "seller_follows"
    __table_args__ = (
        UniqueConstraint(
            "follower_id",
            "seller_id",
            name="uq_seller_follow_follower_seller",
        ),
        CheckConstraint(
            "follower_id <> seller_id",
            name="ck_seller_follow_not_self",
        ),
        Index(
            "ix_seller_follows_follower_created_id",
            "follower_id",
            "created_at",
            "id",
        ),
        Index(
            "ix_seller_follows_seller_follower",
            "seller_id",
            "follower_id",
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_pk)
    follower_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    seller_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
