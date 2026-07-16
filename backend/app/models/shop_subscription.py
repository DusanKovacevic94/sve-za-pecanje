from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, uuid_pk

if TYPE_CHECKING:
    from app.models.user import User


class ShopSubscriptionRequest(Base, TimestampMixin):
    __tablename__ = "shop_subscription_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_pk)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    plan: Mapped[str] = mapped_column(String(30), default="monthly", index=True)
    price_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    currency: Mapped[str] = mapped_column(String(3), default="RSD")
    status: Mapped[str] = mapped_column(String(30), default="pending", index=True)
    payment_reference: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    admin_note: Mapped[str | None] = mapped_column(Text)
    activated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    resolved_by_admin_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))

    user: Mapped["User"] = relationship(foreign_keys=[user_id])
    resolved_by_admin: Mapped["User | None"] = relationship(foreign_keys=[resolved_by_admin_id])
