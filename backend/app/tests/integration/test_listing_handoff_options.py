from sqlalchemy import select

from app.models.audit import AuditLog
from app.models.saved_search import SavedSearch
from app.services.search_service import SearchService


def test_price_and_delivery_filters_match_saved_searches(
    client, db, factories
):
    seller = factories.user()
    category = factories.category(slug="varalice")
    matching = factories.listing(seller, category, title="Varalica po dogovoru")
    matching.price_type = "negotiable"
    matching.delivery_methods = ["courier", "personal_pickup"]
    other = factories.listing(seller, category, title="Fiksna varalica")
    other.price_type = "fixed"
    other.delivery_methods = ["personal_pickup"]
    db.commit()
    filters = {
        "price_type": ["negotiable", "on_request"],
        "delivery_method": "courier",
    }

    response = client.get(
        "/api/v1/listings",
        params=[
            ("price_type", "negotiable"),
            ("price_type", "on_request"),
            ("delivery_method", "courier"),
        ],
    )

    assert response.status_code == 200
    assert [item["id"] for item in response.json()["data"]] == [matching.id]
    assert SearchService(db).matching_count(None, filters) == 1
    saved = SavedSearch(
        user_id=seller.id,
        name="Dostava kurirskom službom",
        filters=filters,
        notification_enabled=True,
    )
    db.add(saved)
    db.commit()
    assert [item.id for item in SearchService(db).matching_listings(None, saved.filters)] == [
        matching.id
    ]


def test_reserved_listing_stays_public_and_blocks_renewal_and_promotions(
    client, db, factories, login_user
):
    owner = factories.user()
    buyer = factories.user()
    other = factories.user()
    category = factories.category()
    listing = factories.listing(owner, category)
    listing.price_type = "free"
    listing.price_amount = None
    listing.delivery_methods = ["seller_arrangement"]
    listing.delivery_note = "Detalje dogovaramo u porukama."
    db.commit()

    login_user(other)
    assert client.post(f"/api/v1/listings/{listing.id}/reserve").status_code == 403

    login_user(owner)
    reserved = client.post(f"/api/v1/listings/{listing.id}/reserve")
    assert reserved.status_code == 200
    assert reserved.json()["data"]["status"] == "reserved"
    assert reserved.json()["data"]["price_amount"] is None
    assert reserved.json()["data"]["delivery_methods"] == ["seller_arrangement"]
    assert client.post(f"/api/v1/listings/{listing.id}/renew").status_code == 409
    promotion = client.post(
        f"/api/v1/listings/{listing.id}/feature-request",
        json={"type": "featured", "package_days": 7},
    )
    assert promotion.status_code == 400

    listing_response = client.get(f"/api/v1/listings/{listing.slug}")
    browse_response = client.get("/api/v1/listings")
    assert listing_response.status_code == 200
    assert listing.id in {item["id"] for item in browse_response.json()["data"]}

    login_user(buyer)
    message = client.post(
        f"/api/v1/listings/{listing.id}/messages",
        json={"body": "Da li rezervacija još važi?"},
    )
    assert message.status_code == 200
    serialized_listing = message.json()["data"]["listing"]
    assert serialized_listing["status"] == "reserved"
    assert serialized_listing["price_type"] == "free"

    login_user(owner)
    unreserved = client.post(f"/api/v1/listings/{listing.id}/unreserve")
    assert unreserved.status_code == 200
    assert unreserved.json()["data"]["status"] == "active"
    actions = set(
        db.scalars(
            select(AuditLog.action).where(AuditLog.entity_id == listing.id)
        ).all()
    )
    assert {"listing.reserved", "listing.unreserved"} <= actions
    sold = client.post(
        f"/api/v1/listings/{listing.id}/mark-sold",
        json={"sold_to_user_id": buyer.id},
    )
    assert sold.status_code == 200
    assert client.post(f"/api/v1/listings/{listing.id}/renew").status_code == 409


def test_invalid_price_combinations_return_price_field_errors(
    client, factories, login_user
):
    owner = factories.user()
    category = factories.category()
    login_user(owner)
    common = {
        "category_id": category.id,
        "title": "Shimano mašinica za pecanje",
        "description": "Detaljan opis opreme i njenog trenutnog stanja za budućeg kupca.",
        "condition": "used_good",
        "currency": "RSD",
        "city": "Beograd",
    }

    missing_amount = client.post(
        "/api/v1/listings",
        json={**common, "price_type": "negotiable"},
    )
    forbidden_amount = client.post(
        "/api/v1/listings",
        json={**common, "price_type": "free", "price_amount": 100},
    )

    assert missing_amount.status_code == 422
    missing_error = missing_amount.json()["error"]["details"]["errors"][0]
    assert missing_error["loc"][-1] == "price_amount"
    assert "Unesite cenu" in missing_error["msg"]
    assert forbidden_amount.status_code == 422
    forbidden_error = forbidden_amount.json()["error"]["details"]["errors"][0]
    assert forbidden_error["loc"][-1] == "price_amount"
    assert "cena se ne unosi" in forbidden_error["msg"]
