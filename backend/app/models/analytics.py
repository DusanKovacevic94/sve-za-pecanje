from datetime import date
from decimal import Decimal

from sqlalchemy import Date, ForeignKey, Integer, JSON, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, uuid_pk


class AnalyticsEvent(Base, TimestampMixin):
    __tablename__ = "analytics_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_pk)
    client_event_id: Mapped[str | None] = mapped_column(String(80), unique=True, index=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), index=True)
    anonymous_id: Mapped[str | None] = mapped_column(String(80), index=True)
    event_name: Mapped[str] = mapped_column(String(120), index=True)
    entity_type: Mapped[str | None] = mapped_column(String(80))
    entity_id: Mapped[str | None] = mapped_column(String(80))
    category_id: Mapped[str | None] = mapped_column(String(36), index=True)
    properties: Mapped[dict] = mapped_column(JSON, default=dict)
    ip_address_hash: Mapped[str | None] = mapped_column(String(120))
    user_agent: Mapped[str | None] = mapped_column(String(300))


class MarketplaceMetricDaily(Base, TimestampMixin):
    __tablename__ = "marketplace_metrics_daily"
    __table_args__ = (
        UniqueConstraint("metric_date", "category_key", name="uq_marketplace_metric_date_category"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_pk)
    metric_date: Mapped[date] = mapped_column(Date, index=True)
    category_key: Mapped[str] = mapped_column(String(36), default="__all__", index=True)
    active_listings: Mapped[int] = mapped_column(Integer, default=0)
    new_approved_listings: Mapped[int] = mapped_column(Integer, default=0)
    unique_active_sellers: Mapped[int] = mapped_column(Integer, default=0)
    listings_with_three_images: Mapped[int] = mapped_column(Integer, default=0)
    searches: Mapped[int] = mapped_column(Integer, default=0)
    zero_result_searches: Mapped[int] = mapped_column(Integer, default=0)
    listing_views: Mapped[int] = mapped_column(Integer, default=0)
    conversations_started: Mapped[int] = mapped_column(Integer, default=0)
    sold_listings: Mapped[int] = mapped_column(Integer, default=0)
    sold_within_30_days: Mapped[int] = mapped_column(Integer, default=0)
    median_days_to_sale: Mapped[Decimal | None] = mapped_column(Numeric(8, 2))
    reports: Mapped[int] = mapped_column(Integer, default=0)
