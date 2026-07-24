from datetime import UTC, datetime, timedelta
from decimal import Decimal
from time import monotonic

from app.models.analytics import AnalyticsEvent
from app.models.listing import Listing
from app.models.search_discovery import PopularSearchQuery
from app.services.search_discovery_service import (
    POPULAR_QUERY_MIN_USERS,
    SearchDiscoveryService,
    refresh_popular_search_queries,
)


def add_search_events(db, users, query: str | None, count_each: int = 1):
    for user in users:
        for index in range(count_each):
            db.add(
                AnalyticsEvent(
                    client_event_id=f"search-{user.id}-{query}-{index}",
                    user_id=user.id,
                    event_name="search_performed",
                    properties={
                        "query_normalized": query,
                        "result_count": 1,
                        "filter_count": 0,
                        "page": 1,
                    },
                    created_at=datetime.now(UTC) - timedelta(days=1),
                )
            )
    db.commit()


def test_popular_queries_require_five_distinct_users_and_respect_blacklist(
    client, db, factories, login_user
):
    users = [factories.user() for _ in range(POPULAR_QUERY_MIN_USERS)]
    add_search_events(db, users, "shimano", count_each=2)
    add_search_events(db, users[:-1], "privatna pretraga")
    add_search_events(db, users, "zabranjen pojam")
    add_search_events(db, users, None)
    admin = factories.user(role="admin")
    login_user(admin)
    blocked = client.post(
        "/api/v1/admin/search-blacklist",
        json={"term": "zabranjen"},
    )
    assert blocked.status_code == 200

    assert refresh_popular_search_queries(db) == 1
    rows = db.query(PopularSearchQuery).all()
    assert [row.query_normalized for row in rows] == ["shimano"]
    assert rows[0].distinct_user_count == POPULAR_QUERY_MIN_USERS
    assert rows[0].search_count == POPULAR_QUERY_MIN_USERS * 2

    popular = client.get("/api/v1/search/popular?limit=6")
    assert popular.status_code == 200
    values = [item["value"] for item in popular.json()["data"]]
    assert values[0] == "shimano"
    assert "privatna pretraga" not in values
    assert all("zabranjen" not in value for value in values)
    assert any(item["source"] == "curated" for item in popular.json()["data"])

    suggestions = client.get(
        "/api/v1/search/suggestions",
        params={"q": "shiman", "limit": 12},
    )
    assert suggestions.status_code == 200
    assert any(
        item["type"] == "common_query"
        and item["value"] == "shimano"
        and item["source"] == "dynamic"
        for item in suggestions.json()["data"]
    )


def test_suggestions_support_diacritics_typos_typed_limits_and_exact_search(
    client, db, factories
):
    seller = factories.user()
    category = factories.category(slug="masinice", name="Mašinice")
    listing = factories.listing(
        seller,
        category,
        title="Shimano Stradic mašinica",
    )

    diacritic = client.get("/api/v1/search/suggestions", params={"q": "masin"})
    typo = client.get("/api/v1/search/suggestions", params={"q": "shimnao", "limit": 3})
    exact_results = client.get("/api/v1/listings", params={"q": "shimnao"})
    recovery = client.get("/api/v1/search/recovery", params={"q": "shimnao"})

    assert diacritic.status_code == 200
    assert any(
        item["type"] == "category" and item["display"] == "Mašinice"
        for item in diacritic.json()["data"]
    )
    assert typo.status_code == 200
    assert len(typo.json()["data"]) <= 3
    assert all(
        {
            "id",
            "type",
            "display",
            "value",
            "href",
            "description",
            "source",
        }
        <= set(item)
        for item in typo.json()["data"]
    )
    assert any("Shimano" in item["display"] for item in typo.json()["data"])
    assert exact_results.status_code == 200
    assert exact_results.json()["meta"]["total"] == 0
    assert recovery.status_code == 200
    assert any(
        "Shimano" in item["display"]
        for item in recovery.json()["data"]["did_you_mean"]
    )
    assert listing.id in {
        item["id"] for item in recovery.json()["data"]["recent_listings"]
    }


def test_suggestion_endpoint_has_bounded_response_time_on_representative_data(
    client, db, factories
):
    seller = factories.user()
    category = factories.category(slug="stapovi", name="Štapovi")
    listings = []
    for index in range(1_000):
        listings.append(
            Listing(
                public_id=f"benchmark-{index}",
                seller_id=seller.id,
                category_id=category.id,
                title=f"Shimano test štap {index}",
                slug=f"benchmark-stap-{index}",
                description="Reprezentativan oglas za merenje brzine predloga pretrage.",
                condition="used_good",
                price_amount=Decimal("1000"),
                currency="RSD",
                city="Beograd",
                status="active",
                attributes={},
                allow_messages=True,
                phone_visible=False,
                expires_at=datetime.now(UTC) + timedelta(days=30),
            )
        )
    db.add_all(listings)
    db.commit()
    assert len(listings) == 1_000

    started = monotonic()
    response = client.get("/api/v1/search/suggestions", params={"q": "shimnao"})
    elapsed = monotonic() - started

    assert response.status_code == 200
    assert elapsed < 1.0


def test_search_blacklist_requires_admin(client, factories, login_user):
    user = factories.user()
    login_user(user)
    assert client.get("/api/v1/admin/search-blacklist").status_code == 403
    assert (
        client.post(
            "/api/v1/admin/search-blacklist",
            json={"term": "nedozvoljeno"},
        ).status_code
        == 403
    )


def test_suggestion_analytics_store_no_raw_query_or_suggestion_value(client, db):
    response = client.post(
        "/api/v1/analytics/events",
        json={
            "client_event_id": "suggestion-event-0001",
            "event_name": "suggestion_selected",
            "anonymous_id": "anonymous-search-user-0001",
            "properties": {
                "query": "private raw query",
                "query_length": 17,
                "suggestion_type": "brand",
                "position": 2,
            },
        },
    )

    assert response.status_code == 200
    event = db.query(AnalyticsEvent).filter_by(
        client_event_id="suggestion-event-0001"
    ).one()
    assert event.properties == {
        "query_length": 17,
        "suggestion_type": "brand",
        "position": 2,
    }
    assert "private raw query" not in str(event.properties)


def test_curated_searches_are_available_before_dynamic_rollup(db):
    items = SearchDiscoveryService(db).popular_searches(limit=6)
    assert len(items) == 6
    assert all(item["source"] == "curated" for item in items)
