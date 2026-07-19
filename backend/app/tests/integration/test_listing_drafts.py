from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select

from app.models import AnalyticsEvent, Listing, ListingFingerprint
from app.tasks.listing_tasks import delete_stale_listing_drafts


def draft_payload(category_id: str, client_draft_id: str = "client-draft-0001") -> dict:
    return {
        "client_draft_id": client_draft_id,
        "category_id": category_id,
        "title": "",
        "description": "",
        "condition": "used_good",
        "price_amount": 0,
        "currency": "RSD",
        "city": "",
        "attributes": {},
    }


def complete_values(category_id: str) -> dict:
    return {
        "category_id": category_id,
        "title": "Shimano Stradic mašinica",
        "description": "Detaljan opis opreme, stanja i sadržaja paketa za budućeg kupca.",
        "condition": "used_good",
        "price_amount": 12000,
        "currency": "RSD",
        "city": "Beograd",
        "attributes": {},
    }


def test_draft_create_is_idempotent_private_and_owner_only(
    client, db, factories, login_user
):
    owner = factories.user()
    other = factories.user()
    admin = factories.user(role="admin")
    category = factories.category()
    login_user(owner)

    first = client.post("/api/v1/listings/drafts", json=draft_payload(category.id))
    repeated = client.post("/api/v1/listings/drafts", json=draft_payload(category.id))

    assert first.status_code == 200
    assert repeated.status_code == 200
    assert first.json()["data"]["id"] == repeated.json()["data"]["id"]
    assert db.scalar(select(func.count(Listing.id))) == 1
    draft = db.get(Listing, first.json()["data"]["id"])
    assert draft is not None
    assert draft.status == "draft"
    assert draft.expires_at is None
    assert client.get(f"/api/v1/listings/{draft.slug}").status_code == 404
    assert client.get("/api/v1/listings").json()["meta"]["total"] == 0

    login_user(other)
    assert client.get(f"/api/v1/listings/{draft.id}/edit").status_code == 403
    assert client.delete(f"/api/v1/listings/drafts/{draft.id}").status_code == 403

    login_user(admin)
    assert client.get(f"/api/v1/listings/{draft.id}/edit").status_code == 200


def test_partial_autosave_detects_conflict_and_session_expiry(
    client, factories, login_user
):
    owner = factories.user()
    category = factories.category()
    login_user(owner)
    created = client.post(
        "/api/v1/listings/drafts",
        json=draft_payload(category.id, "client-draft-conflict"),
    ).json()["data"]

    saved = client.patch(
        f"/api/v1/listings/drafts/{created['id']}",
        json={"expected_version": created["draft_version"], "title": "Novi naslov nacrta"},
    )
    conflict = client.patch(
        f"/api/v1/listings/drafts/{created['id']}",
        json={"expected_version": created["draft_version"], "city": "Novi Sad"},
    )

    assert saved.status_code == 200
    assert saved.json()["data"]["draft_version"] == created["draft_version"] + 1
    assert conflict.status_code == 409
    assert conflict.json()["error"]["code"] == "AUTOSAVE_CONFLICT"
    assert (
        conflict.json()["error"]["details"]["server_version"]
        == saved.json()["data"]["draft_version"]
    )

    client.cookies.clear()
    expired_session = client.patch(
        f"/api/v1/listings/drafts/{created['id']}",
        json={
            "expected_version": saved.json()["data"]["draft_version"],
            "city": "Beograd",
        },
    )
    assert expired_session.status_code == 401


def test_publish_validates_then_uses_existing_moderation_and_analytics_flow(
    client, db, factories, login_user
):
    owner = factories.user()
    category = factories.category()
    login_user(owner)
    created = client.post(
        "/api/v1/listings/drafts",
        json=draft_payload(category.id, "client-draft-publish"),
    ).json()["data"]

    incomplete = client.post(
        f"/api/v1/listings/drafts/{created['id']}/publish",
        json={"expected_version": created["draft_version"]},
    )
    assert incomplete.status_code == 422
    assert incomplete.json()["error"]["code"] == "VALIDATION_ERROR"
    assert db.scalar(select(AnalyticsEvent)) is None

    saved = client.patch(
        f"/api/v1/listings/drafts/{created['id']}",
        json={
            "expected_version": created["draft_version"],
            **complete_values(category.id),
        },
    ).json()["data"]
    published = client.post(
        f"/api/v1/listings/drafts/{created['id']}/publish",
        json={"expected_version": saved["draft_version"]},
    )

    assert published.status_code == 200
    data = published.json()["data"]
    assert data["status"] == "pending_review"
    listing = db.get(Listing, data["id"])
    assert listing is not None
    assert listing.expires_at is not None
    assert listing.draft_last_saved_at is None
    assert db.scalar(
        select(AnalyticsEvent).where(
            AnalyticsEvent.event_name == "listing_published",
            AnalyticsEvent.entity_id == listing.id,
        )
    )
    assert db.scalar(
        select(ListingFingerprint).where(ListingFingerprint.listing_id == listing.id)
    )
    retry = client.post(
        "/api/v1/listings/drafts",
        json=draft_payload(category.id, "client-draft-publish"),
    )
    assert retry.status_code == 409
    assert retry.json()["error"]["code"] == "DRAFT_ALREADY_PUBLISHED"


def test_complete_create_operation_remains_backward_compatible(
    client, factories, login_user
):
    owner = factories.user()
    category = factories.category()
    login_user(owner)

    response = client.post("/api/v1/listings", json=complete_values(category.id))

    assert response.status_code == 200
    assert response.json()["data"]["status"] == "pending_review"


def test_images_can_be_added_before_publish_without_making_draft_public(
    client, db, factories, login_user, monkeypatch
):
    owner = factories.user()
    category = factories.category()
    login_user(owner)
    created = client.post(
        "/api/v1/listings/drafts",
        json=draft_payload(category.id, "client-draft-image"),
    ).json()["data"]
    monkeypatch.setattr(
        "app.services.image_service.store_listing_image",
        lambda _public_id, upload: {
            "storage_key": "drafts/test.webp",
            "url": "/uploads/drafts/test.webp",
            "original_filename": upload.filename,
            "content_type": "image/webp",
            "width": 10,
            "height": 10,
            "size_bytes": 3,
            "content_hash": "a" * 64,
        },
    )

    response = client.post(
        f"/api/v1/listings/{created['id']}/images",
        files={"upload": ("photo.jpg", b"abc", "image/jpeg")},
    )

    assert response.status_code == 200
    draft = db.get(Listing, created["id"])
    db.refresh(draft)
    assert draft.status == "draft"
    assert draft.draft_last_saved_at is not None
    assert client.get(f"/api/v1/listings/{draft.slug}").status_code == 404
    assert client.post(f"/api/v1/listings/{draft.id}/favorite").status_code == 404


def test_stale_draft_cleanup_deletes_only_untouched_drafts(
    db, factories, monkeypatch
):
    owner = factories.user()
    category = factories.category()
    stale = factories.listing(owner, category, status="draft")
    recent = factories.listing(owner, category, status="draft")
    active = factories.listing(owner, category, status="active")
    stale.draft_last_saved_at = datetime.now(UTC) - timedelta(days=91)
    recent.draft_last_saved_at = datetime.now(UTC) - timedelta(days=89)
    active.draft_last_saved_at = datetime.now(UTC) - timedelta(days=100)
    db.commit()
    deleted_storage: list[str] = []
    monkeypatch.setattr(
        "app.tasks.listing_tasks.delete_storage_object",
        deleted_storage.append,
    )

    deleted = delete_stale_listing_drafts(db)

    assert deleted == 1
    assert db.get(Listing, stale.id) is None
    assert db.get(Listing, recent.id) is not None
    assert db.get(Listing, active.id) is not None
