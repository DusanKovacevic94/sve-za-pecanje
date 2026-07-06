from datetime import UTC, datetime, timedelta

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.analytics import AnalyticsEvent
from app.services.view_service import flush_view_counts


def flush_listing_view_counts(db: Session) -> int:
    return flush_view_counts(db)


def delete_old_analytics_events(db: Session) -> int:
    cutoff = datetime.now(UTC) - timedelta(days=settings.analytics_retention_days)
    result = db.execute(delete(AnalyticsEvent).where(AnalyticsEvent.created_at < cutoff))
    db.commit()
    return int(result.rowcount or 0)
