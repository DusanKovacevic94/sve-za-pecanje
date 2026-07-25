from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    JSON,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, utcnow, uuid_pk

if TYPE_CHECKING:
    from app.models.user import User


class UserNotification(Base, TimestampMixin):
    __tablename__ = "user_notifications"
    __table_args__ = (
        UniqueConstraint(
            "recipient_id",
            "deduplication_key",
            name="uq_user_notification_recipient_deduplication",
        ),
        Index(
            "ix_user_notifications_recipient_timeline",
            "recipient_id",
            "last_event_at",
            "id",
        ),
        Index(
            "ix_user_notifications_recipient_unread",
            "recipient_id",
            "read_at",
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_pk)
    recipient_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    actor_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    entity_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    entity_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    deduplication_key: Mapped[str] = mapped_column(String(180), nullable=False)
    last_event_id: Mapped[str | None] = mapped_column(String(180), nullable=True)
    group_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    last_event_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        nullable=False,
    )

    recipient: Mapped["User"] = relationship(foreign_keys=[recipient_id])
    actor: Mapped["User | None"] = relationship(foreign_keys=[actor_id])
