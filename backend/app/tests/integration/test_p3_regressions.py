from app.core import rate_limit
from app.core.config import Settings
from app.services import view_service
from app.api.v1 import contact
from app.models.email_outbox import EmailOutbox
from app.models.report import Report
from app.models.saved_search import SavedSearch
from app.tasks.email_tasks import process_email_outbox


def test_listing_authz_rejects_non_owner_and_non_admin(client, factories, login_user):
    owner = factories.user()
    other = factories.user()
    category = factories.category(slug="stapovi")
    listing = factories.listing(owner, category)

    login_user(other)
    patch_response = client.patch(
        f"/api/v1/listings/{listing.id}",
        json={"title": "Tuđi oglas promenjen"},
    )
    delete_response = client.delete(f"/api/v1/listings/{listing.id}")
    admin_response = client.get("/api/v1/admin/dashboard")

    assert patch_response.status_code == 403
    assert delete_response.status_code == 403
    assert admin_response.status_code == 403


def test_listing_filters_category_price_condition_and_attributes(client, factories):
    seller = factories.user()
    rods = factories.category(slug="stapovi")
    reels = factories.category(slug="masinice")
    match = factories.listing(
        seller,
        rods,
        title="Feeder štap test",
        price=2500,
        condition="used_good",
        attributes={"length": "240"},
    )
    factories.listing(seller, rods, title="Skuplji štap", price=9000, condition="used_good", attributes={"length": "300"})
    factories.listing(seller, reels, title="Mašinica test", price=2500, condition="new", attributes={"length": "240"})

    response = client.get(
        "/api/v1/listings",
        params={
            "category": "stapovi",
            "price_min": "2000",
            "price_max": "3000",
            "condition": "used_good",
            "attributes[length]": "240",
        },
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert [item["id"] for item in data] == [match.id]


def test_detail_get_is_read_only_and_track_view_is_deduped(client, db, factories, monkeypatch):
    seller = factories.user()
    category = factories.category()
    listing = factories.listing(seller, category)
    monkeypatch.setattr(view_service, "_get_redis_client", lambda now: None)
    view_service._dedupe.clear()

    detail_response = client.get(f"/api/v1/listings/{listing.slug}")
    db.refresh(listing)
    assert detail_response.status_code == 200
    assert listing.view_count == 0

    for _ in range(10):
        response = client.post(f"/api/v1/listings/{listing.id}/track-view", headers={"user-agent": "pytest"})
        assert response.status_code == 200

    db.refresh(listing)
    assert listing.view_count == 1


def test_contact_rate_limit_blocks_fourth_submission(client, monkeypatch):
    sent = []
    rate_limit._buckets.clear()
    monkeypatch.setattr(rate_limit.settings, "rate_limit_enabled", True)
    monkeypatch.setattr(contact, "send_email", lambda *args, **kwargs: sent.append((args, kwargs)) or True)

    payload = {
        "name": "Petar",
        "email": "petar@example.com",
        "subject": "Pitanje",
        "message": "Ovo je test poruka preko kontakt forme.",
        "website": "",
    }
    statuses = [client.post("/api/v1/contact", json=payload).status_code for _ in range(4)]

    assert statuses == [200, 200, 200, 429]
    assert len(sent) == 3


def test_only_conversation_participants_can_read_messages(client, factories, login_user):
    seller = factories.user()
    buyer = factories.user()
    intruder = factories.user()
    category = factories.category()
    listing = factories.listing(seller, category)

    login_user(buyer)
    create_response = client.post(
        f"/api/v1/listings/{listing.id}/messages",
        json={"body": "Da li je oprema još dostupna?"},
    )
    assert create_response.status_code == 200
    conversation_id = create_response.json()["data"]["id"]

    login_user(intruder)
    intruder_response = client.get(f"/api/v1/conversations/{conversation_id}")

    assert intruder_response.status_code == 403


def test_review_requires_sale_participant_and_blocks_duplicate(client, db, factories, login_user):
    seller = factories.user()
    buyer = factories.user()
    intruder = factories.user()
    category = factories.category()
    listing = factories.listing(seller, category, status="sold")
    listing.sold_to_user_id = buyer.id
    db.commit()

    payload = {"listing_id": listing.id, "reviewee_id": seller.id, "rating": 5, "comment": "Odlična saradnja."}
    login_user(buyer)
    first_response = client.post("/api/v1/reviews", json=payload)
    duplicate_response = client.post("/api/v1/reviews", json=payload)

    login_user(intruder)
    intruder_response = client.post("/api/v1/reviews", json=payload)

    assert first_response.status_code == 200
    assert duplicate_response.status_code == 409
    assert intruder_response.status_code == 403


def test_saved_search_limit_is_enforced(client, db, factories, login_user):
    user = factories.user()
    for index in range(20):
        db.add(SavedSearch(user_id=user.id, name=f"Pretraga {index}", filters={}, notification_enabled=True))
    db.commit()

    login_user(user)
    response = client.post(
        "/api/v1/saved-searches",
        json={"name": "Još jedna", "query": "stap", "filters": {}, "notification_enabled": True},
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "SAVED_SEARCH_LIMIT"


def test_unread_count_uses_conversation_counts(client, factories, login_user):
    seller = factories.user()
    buyer = factories.user()
    category = factories.category()
    listing = factories.listing(seller, category)

    login_user(buyer)
    create_response = client.post(
        f"/api/v1/listings/{listing.id}/messages",
        json={"body": "Da li je dostupno?"},
    )
    assert create_response.status_code == 200

    login_user(seller)
    count_response = client.get("/api/v1/users/me/unread-count")
    assert count_response.status_code == 200
    assert count_response.json()["data"]["unread_count"] == 1


def test_report_status_is_validated_and_suspend_archives_active_listings(client, db, factories, login_user):
    admin = factories.user(role="admin")
    seller = factories.user()
    reporter = factories.user()
    category = factories.category()
    listing = factories.listing(seller, category)
    report = Report(
        reporter_id=reporter.id,
        listing_id=listing.id,
        reported_user_id=seller.id,
        reason="scam",
        description="Sumnjiv oglas",
    )
    db.add(report)
    db.commit()

    login_user(admin)
    invalid_response = client.post(
        f"/api/v1/admin/reports/{report.id}/resolve",
        json={"status": "closed"},
    )
    suspend_response = client.post(
        f"/api/v1/admin/users/{seller.id}/suspend",
        json={"reason": "Prevara"},
    )

    db.refresh(report)
    db.refresh(listing)
    assert invalid_response.status_code == 422
    assert report.status == "open"
    assert suspend_response.status_code == 200
    assert listing.status == "archived"


def test_email_outbox_without_key_is_not_marked_sent(db, monkeypatch):
    monkeypatch.setattr("app.tasks.email_tasks.settings.app_env", "development")
    monkeypatch.setattr("app.tasks.email_tasks.settings.resend_api_key", "")
    email = EmailOutbox(to_email="test@example.com", subject="Test", body="Body")
    db.add(email)
    db.commit()

    assert process_email_outbox(db) == 1

    db.refresh(email)
    assert email.status == "skipped"
    assert email.sent_at is None


def test_production_requires_resend_api_key():
    try:
        Settings(
            app_env="production",
            secret_key="x" * 32,
            jwt_secret="y" * 32,
            resend_api_key="",
        )
    except ValueError as exc:
        assert "RESEND_API_KEY" in str(exc)
    else:
        raise AssertionError("production config without RESEND_API_KEY should fail")
