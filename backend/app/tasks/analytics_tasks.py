from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.analytics import AnalyticsEvent, MarketplaceMetricDaily
from app.models.search_discovery import SearchDiscoveryState
from app.services.analytics_service import build_marketplace_metrics_range
from app.services.view_service import flush_view_counts
from app.services.search_discovery_service import refresh_popular_search_queries


def flush_listing_view_counts(db: Session) -> int:
    return flush_view_counts(db)


def delete_old_analytics_events(db: Session) -> int:
    cutoff = datetime.now(UTC) - timedelta(days=settings.analytics_retention_days)
    event_result = db.execute(
        delete(AnalyticsEvent)
        .where(AnalyticsEvent.created_at < cutoff)
        .execution_options(synchronize_session=False)
    )
    aggregate_cutoff = (
        datetime.now(ZoneInfo("Europe/Belgrade")).date()
        - timedelta(days=settings.analytics_aggregate_retention_days)
    )
    aggregate_result = db.execute(
        delete(MarketplaceMetricDaily).where(
            MarketplaceMetricDaily.metric_date < aggregate_cutoff
        ).execution_options(synchronize_session=False)
    )
    db.commit()
    return int(event_result.rowcount or 0) + int(aggregate_result.rowcount or 0)


def refresh_marketplace_metrics(db: Session) -> int:
    latest_update = db.scalar(select(func.max(MarketplaceMetricDaily.updated_at)))
    now = datetime.now(UTC)
    if latest_update:
        latest_update = (
            latest_update
            if latest_update.tzinfo
            else latest_update.replace(tzinfo=UTC)
        )
        if latest_update >= now - timedelta(
            minutes=settings.analytics_rollup_interval_minutes
        ):
            return 0
    today = datetime.now(ZoneInfo("Europe/Belgrade")).date()
    return build_marketplace_metrics_range(db, today - timedelta(days=1), today)


def refresh_search_discovery(db: Session) -> int:
    state = db.get(SearchDiscoveryState, "popular_queries")
    latest_update = state.refreshed_at if state else None
    now = datetime.now(UTC)
    if latest_update:
        latest_update = (
            latest_update
            if latest_update.tzinfo
            else latest_update.replace(tzinfo=UTC)
        )
        if latest_update >= now - timedelta(
            minutes=settings.analytics_rollup_interval_minutes
        ):
            return 0
    return refresh_popular_search_queries(db)
