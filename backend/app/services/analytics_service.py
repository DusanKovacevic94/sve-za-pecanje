from __future__ import annotations

import hmac
import re
import unicodedata
from collections import defaultdict
from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal
from hashlib import sha256
from statistics import median
from typing import Any
from zoneinfo import ZoneInfo

from sqlalchemy import delete, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.analytics import AnalyticsEvent, MarketplaceMetricDaily
from app.models.category import Category
from app.models.image import ListingImage
from app.models.listing import Listing
from app.models.message import Conversation
from app.models.report import Report

REPORTING_TIMEZONE = ZoneInfo("Europe/Belgrade")
ALL_CATEGORIES = "__all__"

SERVER_EVENT_NAMES = frozenset(
    {
        "favorite_added",
        "listing_approved",
        "listing_marked_sold",
        "listing_published",
        "listing_viewed",
        "conversation_started",
        "report_created",
        "saved_search_created",
    }
)
PUBLIC_EVENT_NAMES = frozenset(
    {
        "search_performed",
        "suggestion_impression",
        "suggestion_selected",
        "zero_result_recovery",
    }
)
EVENT_NAMES = SERVER_EVENT_NAMES | PUBLIC_EVENT_NAMES

_EMAIL_PATTERN = re.compile(r"\b[^@\s]+@[^@\s]+\.[^@\s]+\b")
_PHONE_PATTERN = re.compile(r"(?:\+?\d[\s().-]*){7,}")


def reporting_day_bounds(metric_date: date) -> tuple[datetime, datetime]:
    local_start = datetime.combine(metric_date, time.min, tzinfo=REPORTING_TIMEZONE)
    local_end = local_start + timedelta(days=1)
    return local_start.astimezone(UTC), local_end.astimezone(UTC)


def _hash_identifier(value: str) -> str:
    return hmac.new(settings.secret_key.encode(), value.encode(), sha256).hexdigest()


def _safe_search_query(value: str | None) -> str | None:
    normalized = unicodedata.normalize("NFKC", value or "")
    normalized = " ".join(normalized.casefold().split())[:160]
    if not normalized or _EMAIL_PATTERN.search(normalized) or _PHONE_PATTERN.search(normalized):
        return None
    return normalized


class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db

    def track(
        self,
        event_name: str,
        user_id: str | None = None,
        properties: dict | None = None,
        *,
        entity_type: str | None = None,
        entity_id: str | None = None,
        category_id: str | None = None,
    ) -> None:
        if event_name not in SERVER_EVENT_NAMES:
            raise ValueError(f"Unsupported server analytics event: {event_name}")
        self.db.add(
            AnalyticsEvent(
                user_id=user_id,
                event_name=event_name,
                entity_type=entity_type,
                entity_id=entity_id,
                category_id=category_id,
                properties=properties or {},
            )
        )

    def track_public_search(
        self,
        *,
        client_event_id: str,
        event_name: str = "search_performed",
        anonymous_id: str,
        user_id: str | None,
        category_id: str | None,
        properties: dict[str, Any],
        ip_address: str,
        user_agent: str | None,
    ) -> bool:
        if self.db.scalar(
            select(AnalyticsEvent.id).where(
                AnalyticsEvent.client_event_id == client_event_id
            )
        ):
            return False
        if category_id and not self.db.get(Category, category_id):
            category_id = None
        if event_name not in PUBLIC_EVENT_NAMES:
            raise ValueError(f"Unsupported public analytics event: {event_name}")
        if event_name == "search_performed":
            safe_properties = {
                "query_normalized": _safe_search_query(properties.get("query")),
                "result_count": int(properties["result_count"]),
                "filter_count": int(properties.get("filter_count", 0)),
                "page": int(properties.get("page", 1)),
            }
        elif event_name == "suggestion_impression":
            safe_properties = {
                "query_length": int(properties.get("query_length") or 0),
                "suggestion_types": list(
                    dict.fromkeys(properties.get("suggestion_types") or [])
                )[:4],
                "suggestion_count": int(properties.get("suggestion_count") or 0),
            }
        elif event_name == "suggestion_selected":
            safe_properties = {
                "query_length": int(properties.get("query_length") or 0),
                "suggestion_type": properties.get("suggestion_type"),
                "position": int(properties.get("position") or 0),
            }
        else:
            safe_properties = {
                "recovery_action": properties.get("recovery_action"),
                "removed_filter": (properties.get("removed_filter") or "")[:80]
                or None,
            }
        event = AnalyticsEvent(
            client_event_id=client_event_id,
            user_id=user_id,
            anonymous_id=_hash_identifier(anonymous_id),
            event_name=event_name,
            category_id=category_id,
            properties=safe_properties,
            ip_address_hash=_hash_identifier(ip_address),
            user_agent=(user_agent or "")[:300] or None,
        )
        self.db.add(event)
        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            return False
        return True


def _empty_metrics() -> dict[str, Any]:
    return {
        "active_listing_ids": set(),
        "active_seller_ids": set(),
        "three_image_listing_ids": set(),
        "new_approved_listings": 0,
        "searches": 0,
        "zero_result_searches": 0,
        "listing_views": 0,
        "conversation_ids": set(),
        "sold_listing_ids": set(),
        "sold_within_30_days": 0,
        "sale_days": [],
        "report_ids": set(),
    }


def _category_dimension_keys(
    category_id: str | None, parent_by_category: dict[str, str | None]
) -> tuple[str, ...]:
    keys = [ALL_CATEGORIES]
    current = category_id
    seen: set[str] = set()
    while current and current not in seen:
        keys.append(current)
        seen.add(current)
        current = parent_by_category.get(current)
    return tuple(keys)


def _add_to_dimensions(
    metrics: defaultdict[str, dict[str, Any]],
    category_id: str | None,
    field: str,
    value: Any,
    parent_by_category: dict[str, str | None],
) -> None:
    for key in _category_dimension_keys(category_id, parent_by_category):
        bucket = metrics[key]
        if isinstance(bucket[field], set):
            bucket[field].add(value)
        elif isinstance(bucket[field], list):
            bucket[field].append(value)
        else:
            bucket[field] += value


def _active_listing_rows(db: Session, start: datetime, end: datetime):
    approved_before_end = or_(
        Listing.approved_at < end,
        (
            Listing.approved_at.is_(None)
            & (Listing.created_at < end)
            & Listing.status.in_(["active", "reserved", "sold"])
        ),
    )
    not_sold_before_end = or_(Listing.sold_at.is_(None), Listing.sold_at >= end)
    not_expired_before_end = or_(Listing.expires_at.is_(None), Listing.expires_at >= end)
    return db.execute(
        select(
            Listing.id,
            Listing.category_id,
            Listing.seller_id,
            func.count(ListingImage.id).label("image_count"),
        )
        .outerjoin(ListingImage, ListingImage.listing_id == Listing.id)
        .where(
            Listing.created_at < end,
            approved_before_end,
            not_sold_before_end,
            not_expired_before_end,
            Listing.status.in_(["active", "reserved", "sold"]),
        )
        .group_by(Listing.id, Listing.category_id, Listing.seller_id)
    ).all()


def build_marketplace_metrics_for_day(db: Session, metric_date: date) -> int:
    start, end = reporting_day_bounds(metric_date)
    metrics: defaultdict[str, dict[str, Any]] = defaultdict(_empty_metrics)
    metrics[ALL_CATEGORIES]
    parent_by_category = dict(
        db.execute(select(Category.id, Category.parent_id)).all()
    )

    for listing_id, category_id, seller_id, image_count in _active_listing_rows(
        db, start, end
    ):
        _add_to_dimensions(
            metrics,
            category_id,
            "active_listing_ids",
            listing_id,
            parent_by_category,
        )
        _add_to_dimensions(
            metrics,
            category_id,
            "active_seller_ids",
            seller_id,
            parent_by_category,
        )
        if int(image_count or 0) >= 3:
            _add_to_dimensions(
                metrics,
                category_id,
                "three_image_listing_ids",
                listing_id,
                parent_by_category,
            )

    approved_rows = db.execute(
        select(Listing.id, Listing.category_id).where(
            Listing.approved_at >= start,
            Listing.approved_at < end,
        )
    ).all()
    for _listing_id, category_id in approved_rows:
        _add_to_dimensions(
            metrics,
            category_id,
            "new_approved_listings",
            1,
            parent_by_category,
        )

    events = db.execute(
        select(
            AnalyticsEvent.event_name,
            AnalyticsEvent.entity_id,
            AnalyticsEvent.category_id,
            AnalyticsEvent.properties,
        ).where(
            AnalyticsEvent.created_at >= start,
            AnalyticsEvent.created_at < end,
        )
    ).all()
    for event_name, entity_id, category_id, properties in events:
        if event_name == "search_performed":
            _add_to_dimensions(
                metrics, category_id, "searches", 1, parent_by_category
            )
            if int((properties or {}).get("result_count", 0)) == 0:
                _add_to_dimensions(
                    metrics,
                    category_id,
                    "zero_result_searches",
                    1,
                    parent_by_category,
                )
        elif event_name == "listing_viewed":
            _add_to_dimensions(
                metrics, category_id, "listing_views", 1, parent_by_category
            )

    conversations = db.execute(
        select(Conversation.id, Listing.category_id)
        .join(Listing, Listing.id == Conversation.listing_id)
        .where(Conversation.created_at >= start, Conversation.created_at < end)
    ).all()
    for conversation_id, category_id in conversations:
        _add_to_dimensions(
            metrics,
            category_id,
            "conversation_ids",
            conversation_id,
            parent_by_category,
        )

    sold_rows = db.execute(
        select(
            Listing.id,
            Listing.category_id,
            Listing.created_at,
            Listing.approved_at,
            Listing.sold_at,
        ).where(Listing.sold_at >= start, Listing.sold_at < end)
    ).all()
    for listing_id, category_id, created_at, approved_at, sold_at in sold_rows:
        listed_at = approved_at or created_at
        days_to_sale = max((sold_at - listed_at).total_seconds() / 86_400, 0)
        _add_to_dimensions(
            metrics,
            category_id,
            "sold_listing_ids",
            listing_id,
            parent_by_category,
        )
        _add_to_dimensions(
            metrics,
            category_id,
            "sale_days",
            days_to_sale,
            parent_by_category,
        )
        if days_to_sale <= 30:
            _add_to_dimensions(
                metrics,
                category_id,
                "sold_within_30_days",
                1,
                parent_by_category,
            )

    reports = db.execute(
        select(Report.id, Listing.category_id)
        .outerjoin(Listing, Listing.id == Report.listing_id)
        .where(Report.created_at >= start, Report.created_at < end)
    ).all()
    for report_id, category_id in reports:
        _add_to_dimensions(
            metrics,
            category_id,
            "report_ids",
            report_id,
            parent_by_category,
        )

    db.execute(
        delete(MarketplaceMetricDaily)
        .where(MarketplaceMetricDaily.metric_date == metric_date)
        .execution_options(synchronize_session=False)
    )
    for category_key, values in metrics.items():
        sale_days = values["sale_days"]
        db.add(
            MarketplaceMetricDaily(
                metric_date=metric_date,
                category_key=category_key,
                active_listings=len(values["active_listing_ids"]),
                new_approved_listings=values["new_approved_listings"],
                unique_active_sellers=len(values["active_seller_ids"]),
                listings_with_three_images=len(values["three_image_listing_ids"]),
                searches=values["searches"],
                zero_result_searches=values["zero_result_searches"],
                listing_views=values["listing_views"],
                conversations_started=len(values["conversation_ids"]),
                sold_listings=len(values["sold_listing_ids"]),
                sold_within_30_days=values["sold_within_30_days"],
                median_days_to_sale=(
                    Decimal(str(round(float(median(sale_days)), 2)))
                    if sale_days
                    else None
                ),
                reports=len(values["report_ids"]),
            )
        )
    db.commit()
    return len(metrics)


def build_marketplace_metrics_range(
    db: Session, start_date: date, end_date: date
) -> int:
    if end_date < start_date:
        raise ValueError("end_date must be on or after start_date")
    total = 0
    current = start_date
    while current <= end_date:
        total += build_marketplace_metrics_for_day(db, current)
        current += timedelta(days=1)
    return total


def _rate(numerator: int, denominator: int, multiplier: int = 100) -> float | None:
    if denominator <= 0:
        return None
    return round(numerator / denominator * multiplier, 2)


def _serialize_daily(row: MarketplaceMetricDaily) -> dict[str, Any]:
    return {
        "date": row.metric_date.isoformat(),
        "active_listings": row.active_listings,
        "new_approved_listings": row.new_approved_listings,
        "unique_active_sellers": row.unique_active_sellers,
        "listings_with_three_images": row.listings_with_three_images,
        "photo_quality_rate": _rate(
            row.listings_with_three_images, row.active_listings
        ),
        "searches": row.searches,
        "zero_result_searches": row.zero_result_searches,
        "zero_result_rate": _rate(row.zero_result_searches, row.searches),
        "listing_views": row.listing_views,
        "conversations_started": row.conversations_started,
        "contact_conversion_rate": _rate(
            row.conversations_started, row.listing_views
        ),
        "sold_listings": row.sold_listings,
        "sold_within_30_days": row.sold_within_30_days,
        "sold_within_30_days_rate": _rate(
            row.sold_within_30_days, row.sold_listings
        ),
        "median_days_to_sale": (
            float(row.median_days_to_sale)
            if row.median_days_to_sale is not None
            else None
        ),
        "reports": row.reports,
        "report_rate_per_1000_views": _rate(
            row.reports, row.listing_views, multiplier=1000
        ),
    }


def _summary(rows: list[MarketplaceMetricDaily]) -> dict[str, Any] | None:
    if not rows:
        return None
    latest = max(rows, key=lambda row: row.metric_date)
    searches = sum(row.searches for row in rows)
    zero_results = sum(row.zero_result_searches for row in rows)
    views = sum(row.listing_views for row in rows)
    conversations = sum(row.conversations_started for row in rows)
    sold = sum(row.sold_listings for row in rows)
    sold_30 = sum(row.sold_within_30_days for row in rows)
    reports = sum(row.reports for row in rows)
    sale_days = [
        float(row.median_days_to_sale)
        for row in rows
        for _ in range(max(row.sold_listings, 1))
        if row.median_days_to_sale is not None
    ]
    return {
        "active_listings": latest.active_listings,
        "new_approved_listings": sum(row.new_approved_listings for row in rows),
        "unique_active_sellers": latest.unique_active_sellers,
        "photo_quality_rate": _rate(
            latest.listings_with_three_images, latest.active_listings
        ),
        "searches": searches,
        "zero_result_rate": _rate(zero_results, searches),
        "listing_views": views,
        "conversations_started": conversations,
        "contact_conversion_rate": _rate(conversations, views),
        "sold_listings": sold,
        "sold_within_30_days_rate": _rate(sold_30, sold),
        "median_days_to_sale": round(float(median(sale_days)), 2)
        if sale_days
        else None,
        "reports": reports,
        "report_rate_per_1000_views": _rate(reports, views, multiplier=1000),
    }


def _changes(
    current: dict[str, Any] | None, previous: dict[str, Any] | None
) -> dict[str, float | None]:
    if not current or not previous:
        return {}
    result: dict[str, float | None] = {}
    for key, current_value in current.items():
        previous_value = previous.get(key)
        if current_value is None or previous_value in (None, 0):
            result[key] = None
        else:
            result[key] = round(
                (float(current_value) - float(previous_value))
                / abs(float(previous_value))
                * 100,
                2,
            )
    return result


def marketplace_dashboard(
    db: Session, *, days: int, category_id: str | None = None
) -> dict[str, Any]:
    today = datetime.now(REPORTING_TIMEZONE).date()
    current_start = today - timedelta(days=days - 1)
    previous_end = current_start - timedelta(days=1)
    previous_start = previous_end - timedelta(days=days - 1)
    category_key = category_id or ALL_CATEGORIES
    rows = list(
        db.scalars(
            select(MarketplaceMetricDaily)
            .where(
                MarketplaceMetricDaily.category_key == category_key,
                MarketplaceMetricDaily.metric_date >= previous_start,
                MarketplaceMetricDaily.metric_date <= today,
            )
            .order_by(MarketplaceMetricDaily.metric_date)
        ).all()
    )
    current_rows = [row for row in rows if row.metric_date >= current_start]
    previous_rows = [row for row in rows if row.metric_date <= previous_end]
    current_summary = _summary(current_rows)
    previous_summary = _summary(previous_rows)
    category = db.get(Category, category_id) if category_id else None
    return {
        "period": {
            "days": days,
            "from": current_start.isoformat(),
            "to": today.isoformat(),
            "category_id": category_id,
            "category_name": category.name_sr if category else None,
        },
        "has_data": bool(current_rows),
        "summary": current_summary,
        "previous_summary": previous_summary,
        "changes": _changes(current_summary, previous_summary),
        "series": [_serialize_daily(row) for row in current_rows],
    }
