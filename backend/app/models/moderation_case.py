from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, uuid_pk


class ModerationCase(Base, TimestampMixin):
    __tablename__ = "moderation_cases"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_pk)
    entity_type: Mapped[str] = mapped_column(String(40), index=True)
    entity_id: Mapped[str] = mapped_column(String(80), index=True)
    subject_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), index=True)
    risk_score: Mapped[int] = mapped_column(Integer, default=0, index=True)
    reason_codes: Mapped[list[str]] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(30), default="open", index=True)
    assigned_admin_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), index=True)
    internal_notes: Mapped[str | None] = mapped_column(Text)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)


class AbuseSignal(Base, TimestampMixin):
    __tablename__ = "abuse_signals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_pk)
    signal_type: Mapped[str] = mapped_column(String(80), index=True)
    actor_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), index=True)
    network_hash: Mapped[str | None] = mapped_column(String(64), index=True)
    entity_type: Mapped[str | None] = mapped_column(String(40), index=True)
    entity_id: Mapped[str | None] = mapped_column(String(80), index=True)
    score: Mapped[int] = mapped_column(Integer, default=0)
    metadata_json: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class ListingFingerprint(Base, TimestampMixin):
    __tablename__ = "listing_fingerprints"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_pk)
    listing_id: Mapped[str] = mapped_column(ForeignKey("listings.id"), unique=True, index=True)
    seller_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    content_hash: Mapped[str] = mapped_column(String(64), index=True)
    image_hashes: Mapped[list[str]] = mapped_column(JSON, default=list)
    combined_hash: Mapped[str] = mapped_column(String(64), index=True)
