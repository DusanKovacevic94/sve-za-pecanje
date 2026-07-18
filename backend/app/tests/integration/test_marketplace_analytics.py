from datetime import UTC, date, datetime, timedelta
from uuid import uuid4
from zoneinfo import ZoneInfo

from sqlalchemy import select

from app.models import AnalyticsEvent, MarketplaceMetricDaily
from app.models.image import ListingImage
from app.models.message import Conversation
from app.models.report import Report
from app.services.analytics_service import (
    ALL_CATEGORIES,
    build_marketplace_metrics_for_day,
    reporting_day_bounds,
)
from app.tasks.analytics_tasks import delete_old_analytics_events


def test_public_search_event_is_allowlisted_private_and_deduplicated(
    client, db, factories, login_user
):
    user = factories.user()
    login_user(user)
    event_id = str(uuid4())
    payload = {
        "client_event_id": event_id,
        "event_name": "search_performed",
        "anonymous_id": str(uuid4()),
        "category_id": "missing-category",
        "properties": {
            "query": "  TEST@EXAMPLE.COM  ",
            "result_count": 0,
            "filter_count": 2,
            "page": 1,
        },
    }

    first = client.post(
        "/api/v1/analytics/events",
        json=payload,
        headers={"user-agent": "analytics-test-agent"},
    )
    duplicate = client.post("/api/v1/analytics/events", json=payload)
    invalid = client.post(
        "/api/v1/analytics/events",
        json={**payload, "client_event_id": str(uuid4()), "event_name": "admin_opened"},
    )

    assert first.status_code == 200
    assert first.json()["data"] == {"tracked": True, "duplicate": False}
    assert duplicate.status_code == 200
    assert duplicate.json()["data"] == {"tracked": False, "duplicate": True}
    assert invalid.status_code == 422

    events = list(
        db.scalars(
            select(AnalyticsEvent).where(
                AnalyticsEvent.client_event_id == event_id
            )
        ).all()
    )
    assert len(events) == 1
    assert events[0].user_id == user.id
    assert events[0].anonymous_id != payload["anonymous_id"]
    assert events[0].ip_address_hash not in {None, "testclient"}
    assert events[0].properties == {
        "query_normalized": None,
        "result_count": 0,
        "filter_count": 2,
        "page": 1,
    }
    assert events[0].category_id is None


def test_daily_rollup_calculates_supply_demand_liquidity_and_category_metrics(
    db, factories
):
    metric_date = datetime.now(ZoneInfo("Europe/Belgrade")).date()
    start, _end = reporting_day_bounds(metric_date)
    seller = factories.user()
    buyer = factories.user()
    parent_category = factories.category(slug="stapovi")
    category = factories.category(slug="spin-stapovi")
    category.parent_id = parent_category.id
    db.commit()

    active = factories.listing(seller, category, title="Aktivan oglas")
    active.created_at = start + timedelta(hours=1)
    active.approved_at = start + timedelta(hours=2)
    for index in range(3):
        db.add(
            ListingImage(
                listing_id=active.id,
                storage_key=f"analytics/{index}.jpg",
                url=f"https://example.com/{index}.jpg",
                content_type="image/jpeg",
                sort_order=index,
                is_cover=index == 0,
            )
        )

    sold = factories.listing(seller, category, title="Prodat oglas", status="sold")
    sold.created_at = start - timedelta(days=10)
    sold.approved_at = start - timedelta(days=10)
    sold.sold_at = start + timedelta(hours=4)

    conversation = Conversation(
        listing_id=active.id,
        buyer_id=buyer.id,
        seller_id=seller.id,
        created_at=start + timedelta(hours=5),
        updated_at=start + timedelta(hours=5),
    )
    report = Report(
        reporter_id=buyer.id,
        listing_id=active.id,
        reported_user_id=seller.id,
        reason="scam",
        created_at=start + timedelta(hours=6),
        updated_at=start + timedelta(hours=6),
    )
    db.add_all([conversation, report])
    db.add_all(
        [
            AnalyticsEvent(
                client_event_id=str(uuid4()),
                event_name="search_performed",
                category_id=category.id,
                properties={"result_count": 1},
                created_at=start + timedelta(hours=7),
                updated_at=start + timedelta(hours=7),
            ),
            AnalyticsEvent(
                client_event_id=str(uuid4()),
                event_name="search_performed",
                category_id=category.id,
                properties={"result_count": 0},
                created_at=start + timedelta(hours=8),
                updated_at=start + timedelta(hours=8),
            ),
            AnalyticsEvent(
                event_name="listing_viewed",
                entity_type="listing",
                entity_id=active.id,
                category_id=category.id,
                properties={},
                created_at=start + timedelta(hours=9),
                updated_at=start + timedelta(hours=9),
            ),
            AnalyticsEvent(
                event_name="listing_viewed",
                entity_type="listing",
                entity_id=active.id,
                category_id=category.id,
                properties={},
                created_at=start + timedelta(hours=10),
                updated_at=start + timedelta(hours=10),
            ),
        ]
    )
    db.commit()

    assert build_marketplace_metrics_for_day(db, metric_date) == 3
    category_row = db.scalar(
        select(MarketplaceMetricDaily).where(
            MarketplaceMetricDaily.metric_date == metric_date,
            MarketplaceMetricDaily.category_key == category.id,
        )
    )
    overall_row = db.scalar(
        select(MarketplaceMetricDaily).where(
            MarketplaceMetricDaily.metric_date == metric_date,
            MarketplaceMetricDaily.category_key == ALL_CATEGORIES,
        )
    )
    parent_row = db.scalar(
        select(MarketplaceMetricDaily).where(
            MarketplaceMetricDaily.metric_date == metric_date,
            MarketplaceMetricDaily.category_key == parent_category.id,
        )
    )

    assert category_row is not None
    assert overall_row is not None
    assert parent_row is not None
    assert category_row.active_listings == 1
    assert category_row.new_approved_listings == 1
    assert category_row.unique_active_sellers == 1
    assert category_row.listings_with_three_images == 1
    assert category_row.searches == 2
    assert category_row.zero_result_searches == 1
    assert category_row.listing_views == 2
    assert category_row.conversations_started == 1
    assert category_row.sold_listings == 1
    assert category_row.sold_within_30_days == 1
    assert float(category_row.median_days_to_sale) == 10.17
    assert category_row.reports == 1
    assert overall_row.searches == category_row.searches
    assert parent_row.active_listings == category_row.active_listings
    assert parent_row.searches == category_row.searches

    # Rebuilding the same day replaces, rather than duplicates, the rollup rows.
    assert build_marketplace_metrics_for_day(db, metric_date) == 3
    assert len(
        db.scalars(
            select(MarketplaceMetricDaily).where(
                MarketplaceMetricDaily.metric_date == metric_date
            )
        ).all()
    ) == 3


def test_critical_marketplace_actions_create_server_events(
    client, db, factories, login_user
):
    admin = factories.user(role="admin")
    seller = factories.user()
    buyer = factories.user()
    category = factories.category(slug="stapovi")
    listing = factories.listing(seller, category)
    pending = factories.listing(
        seller, category, title="Oglas za odobrenje", status="pending_review"
    )

    login_user(buyer)
    assert client.post(f"/api/v1/listings/{listing.id}/favorite").status_code == 200
    assert (
        client.post(
            "/api/v1/saved-searches",
            json={
                "name": "Feeder štapovi",
                "query": "feeder",
                "filters": {"category": category.slug},
                "notification_enabled": True,
            },
        ).status_code
        == 200
    )
    assert (
        client.post(
            f"/api/v1/listings/{listing.id}/messages",
            json={"body": "Da li je oglas dostupan?"},
        ).status_code
        == 200
    )
    assert (
        client.post(
            f"/api/v1/listings/{listing.id}/report",
            json={"reason": "other", "description": "Test prijava"},
        ).status_code
        == 200
    )

    login_user(seller)
    assert (
        client.post(
            f"/api/v1/listings/{listing.id}/mark-sold",
            json={"sold_to_user_id": buyer.id},
        ).status_code
        == 200
    )

    login_user(admin)
    assert (
        client.post(f"/api/v1/admin/listings/{pending.id}/approve").status_code
        == 200
    )

    events = list(db.scalars(select(AnalyticsEvent)).all())
    names = {event.event_name for event in events}
    assert {
        "favorite_added",
        "saved_search_created",
        "conversation_started",
        "report_created",
        "listing_marked_sold",
        "listing_approved",
    } <= names
    assert all(
        event.category_id == category.id
        for event in events
        if event.event_name in names
    )


def test_admin_marketplace_dashboard_authorization_comparison_and_csv(
    client, db, factories, login_user
):
    admin = factories.user(role="admin")
    user = factories.user()
    today = datetime.now(ZoneInfo("Europe/Belgrade")).date()
    db.add_all(
        [
            MarketplaceMetricDaily(
                metric_date=today - timedelta(days=30),
                category_key=ALL_CATEGORIES,
                active_listings=5,
                searches=10,
                listing_views=20,
                conversations_started=2,
            ),
            MarketplaceMetricDaily(
                metric_date=today,
                category_key=ALL_CATEGORIES,
                active_listings=10,
                unique_active_sellers=3,
                searches=20,
                zero_result_searches=5,
                listing_views=40,
                conversations_started=8,
                sold_listings=2,
                sold_within_30_days=1,
            ),
        ]
    )
    db.commit()

    login_user(user)
    forbidden = client.get("/api/v1/admin/analytics/marketplace?days=30")
    assert forbidden.status_code == 403

    login_user(admin)
    response = client.get("/api/v1/admin/analytics/marketplace?days=30")
    csv_response = client.get("/api/v1/admin/analytics/marketplace.csv?days=30")

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["has_data"] is True
    assert data["summary"]["active_listings"] == 10
    assert data["summary"]["zero_result_rate"] == 25.0
    assert data["summary"]["contact_conversion_rate"] == 20.0
    assert data["changes"]["active_listings"] == 100.0
    assert csv_response.status_code == 200
    assert csv_response.headers["content-type"].startswith("text/csv")
    assert "active_listings" in csv_response.text
    assert today.isoformat() in csv_response.text


def test_reporting_timezone_and_retention_windows(db, monkeypatch):
    summer_start, _ = reporting_day_bounds(date(2026, 7, 1))
    winter_start, _ = reporting_day_bounds(date(2026, 1, 1))
    assert summer_start.hour == 22
    assert winter_start.hour == 23

    now = datetime.now(UTC)
    old_event = AnalyticsEvent(
        event_name="listing_viewed",
        properties={},
        created_at=now - timedelta(days=91),
        updated_at=now - timedelta(days=91),
    )
    recent_event = AnalyticsEvent(event_name="listing_viewed", properties={})
    old_metric = MarketplaceMetricDaily(
        metric_date=now.date() - timedelta(days=731),
        category_key=ALL_CATEGORIES,
    )
    recent_metric = MarketplaceMetricDaily(
        metric_date=now.date(),
        category_key=ALL_CATEGORIES,
    )
    db.add_all([old_event, recent_event, old_metric, recent_metric])
    db.commit()
    old_event_id = old_event.id
    recent_event_id = recent_event.id
    old_metric_id = old_metric.id
    recent_metric_id = recent_metric.id
    monkeypatch.setattr(
        "app.tasks.analytics_tasks.settings.analytics_retention_days", 90
    )
    monkeypatch.setattr(
        "app.tasks.analytics_tasks.settings.analytics_aggregate_retention_days", 730
    )

    assert delete_old_analytics_events(db) == 2
    assert db.get(AnalyticsEvent, old_event_id) is None
    assert db.get(MarketplaceMetricDaily, old_metric_id) is None
    assert db.get(AnalyticsEvent, recent_event_id) is not None
    assert db.get(MarketplaceMetricDaily, recent_metric_id) is not None
