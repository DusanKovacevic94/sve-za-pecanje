from datetime import UTC, datetime, timedelta
from uuid import uuid4
from zoneinfo import ZoneInfo

from sqlalchemy import select

from app.models.analytics import AnalyticsEvent, MarketplaceMetricDaily
from app.services.analytics_service import build_marketplace_metrics_for_day
from app.tasks.analytics_tasks import delete_old_analytics_events


def event(name="blog_viewed", *, post="12", view=None, target=None):
    view = view or str(uuid4())
    return {
        "client_event_id": str(uuid4()),
        "anonymous_id": view,
        "event_name": name,
        "properties": {
            "post_id": post,
            "view_id": view,
            **({"target_id": target} if target else {}),
        },
    }


def test_blog_events_dedupe_privacy_and_report(client, db, factories, login_user):
    login_user(factories.user())
    view = str(uuid4())
    payloads = [
        event(view=view),
        event(),
        event(post="13"),
        event("blog_category_clicked", view=view, target="category-1"),
        event("blog_listing_clicked", view=view, target="listing-1"),
        event("blog_listing_clicked", view=view, target="listing-2"),
    ]
    for payload in payloads:
        assert client.post("/api/v1/analytics/events", json=payload).json()["data"]["tracked"]
        # A new client_event_id does not defeat per-view/per-target dedupe.
        duplicate = client.post(
            "/api/v1/analytics/events", json={**payload, "client_event_id": str(uuid4())}
        )
        assert duplicate.json()["data"] == {"tracked": False, "duplicate": True}
    rows = db.scalars(select(AnalyticsEvent)).all()
    assert len(rows) == 6
    assert all(row.user_id is None and row.user_agent is None for row in rows)
    assert all(row.anonymous_id != view and row.ip_address_hash != "testclient" for row in rows)
    assert all(set(row.properties) <= {"view_id", "target_id"} for row in rows)
    assert client.get("/api/v1/analytics/blog").status_code == 403
    login_user(factories.user(role="admin"))
    report_response = client.get("/api/v1/analytics/blog?days=30")
    assert report_response.headers["cache-control"] == "private, no-store"
    report = report_response.json()["data"]
    assert report["posts"] == [
        {
            "post_id": "12",
            "article_views": 2,
            "category_clicks": 1,
            "listing_clicks": 2,
            "clicked_views": 1,
            "click_through_rate": 50.0,
        },
        {
            "post_id": "13",
            "article_views": 1,
            "category_clicks": 0,
            "listing_clicks": 0,
            "clicked_views": 0,
            "click_through_rate": 0.0,
        },
    ]
    assert client.get("/api/v1/analytics/blog?days=91").status_code == 422
    build_marketplace_metrics_for_day(db, datetime.now(ZoneInfo("Europe/Belgrade")).date())
    assert all(
        row.searches == row.listing_views == row.conversations_started == row.sold_listings == 0
        for row in db.scalars(select(MarketplaceMetricDaily)).all()
    )


def test_blog_rejects_unknown_properties_wrong_event_shapes_and_bots(client, db):
    valid = event()
    invalid = [
        {**valid, "event_name": "blog_sale"},
        {**valid, "unexpected": True},
        {**valid, "properties": {**valid["properties"], "url": "https://private.example"}},
        {**valid, "properties": {**valid["properties"], "preview": True}},
        {**valid, "properties": {**valid["properties"], "post_id": "draft-slug"}},
        {**valid, "event_name": "blog_category_clicked"},
        event(target="unexpected-target"),
        {**valid, "category_id": "unexpected"},
        {**valid, "event_name": "search_performed"},
        {
            **valid,
            "event_name": "search_performed",
            "properties": {"result_count": 1, "private": 1},
        },
    ]
    for payload in invalid:
        assert client.post("/api/v1/analytics/events", json=payload).status_code == 422
    response = client.post(
        "/api/v1/analytics/events", json=valid, headers={"user-agent": "Googlebot"}
    )
    assert response.json()["data"]["excluded"] is True
    assert not db.scalars(select(AnalyticsEvent)).all()
    assert client.get("/api/v1/analytics/blog").status_code == 401


def test_blog_report_handles_orphan_clicks_and_retention_boundary(
    client, db, factories, login_user
):
    client.post(
        "/api/v1/analytics/events", json=event("blog_listing_clicked", target="gone-listing")
    )
    old = AnalyticsEvent(
        event_name="blog_viewed",
        entity_type="blog_post",
        entity_id="12",
        properties={"view_id": "old"},
        created_at=datetime.now(UTC) - timedelta(days=91),
    )
    db.add(old)
    db.commit()
    login_user(factories.user(role="admin"))
    report = client.get("/api/v1/analytics/blog?days=90").json()["data"]["posts"][0]
    assert report["article_views"] == 0
    assert report["listing_clicks"] == 1
    assert report["clicked_views"] == 0
    assert report["click_through_rate"] is None
    old_id = old.id
    assert delete_old_analytics_events(db) == 1
    assert db.get(AnalyticsEvent, old_id) is None


def test_blog_discovery_uses_public_category_descendants_and_available_filter(
    client, db, factories
):
    seller = factories.user()
    parent = factories.category()
    child = factories.category()
    child.parent_id = parent.id
    db.commit()
    eligible = factories.listing(seller, child)
    for status in ("sold", "deleted", "archived", "draft", "pending_review", "reserved"):
        factories.listing(seller, child, status=status)
    expired = factories.listing(seller, child)
    expired.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    factories.listing(seller, factories.category())
    db.commit()
    assert client.get(f"/api/v1/categories/{parent.slug}").json()["data"]["id"] == parent.id
    response = client.get(
        f"/api/v1/listings?category={parent.slug}&availability=available&page_size=3"
    )
    assert response.status_code == 200
    assert [row["id"] for row in response.json()["data"]] == [eligible.id]
    # Removing the last eligible listing produces an honest empty result.
    eligible.status = "sold"
    db.commit()
    assert (
        client.get(f"/api/v1/listings?category={parent.slug}&availability=available").json()["data"]
        == []
    )
    parent.is_active = False
    db.commit()
    assert client.get(f"/api/v1/categories/{parent.slug}").status_code == 404
