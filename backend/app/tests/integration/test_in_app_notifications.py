from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.models.notification import UserNotification
from app.models.saved_search import SavedSearch
from app.services.message_service import MessageService
from app.services.notification_service import NotificationService
from app.tasks.notification_tasks import (
    delete_old_notifications,
    send_listing_expiry_reminders,
)
from app.tasks.saved_search_tasks import send_saved_search_digests


def test_message_notifications_consolidate_deduplicate_and_update_unread_count(
    client, db, factories, login_user
):
    seller = factories.user()
    buyer = factories.user()
    listing = factories.listing(seller, factories.category())
    conversation = MessageService(db).send_for_listing(
        listing.id,
        buyer,
        "Prva privatna poruka",
    )
    MessageService(db).reply(
        conversation.id,
        buyer,
        "Druga privatna poruka",
    )

    notification = db.scalar(
        select(UserNotification).where(
            UserNotification.recipient_id == seller.id
        )
    )
    assert notification
    assert notification.group_count == 2
    assert notification.read_at is None
    assert "privatna poruka" not in str(notification.payload).lower()

    service = NotificationService(db)
    service.create(
        recipient_id=seller.id,
        type_="new_message",
        deduplication_key=f"conversation:{conversation.id}",
        actor_id=buyer.id,
        entity_type="conversation",
        entity_id=conversation.id,
        event_id=notification.last_event_id,
        consolidate=True,
    )
    db.commit()
    assert db.get(UserNotification, notification.id).group_count == 2

    login_user(seller)
    count = client.get("/api/v1/notifications/unread-count")
    assert count.status_code == 200
    assert count.json()["data"]["unread_count"] == 1

    feed = client.get("/api/v1/notifications")
    assert feed.status_code == 200
    assert feed.json()["data"][0]["group_count"] == 2
    assert feed.json()["data"][0]["href"] == f"/nalog/poruke/{conversation.id}"

    read = client.post(f"/api/v1/notifications/{notification.id}/read")
    assert read.status_code == 200
    assert client.get("/api/v1/notifications/unread-count").json()["data"] == {
        "unread_count": 0
    }

    login_user(buyer)
    forbidden = client.post(f"/api/v1/notifications/{notification.id}/read")
    assert forbidden.status_code == 404


def test_cursor_pagination_mark_all_and_recipient_owned_cursor(
    client, db, factories, login_user
):
    user = factories.user()
    other = factories.user()
    service = NotificationService(db)
    created = []
    for index in range(4):
        item = service.create(
            recipient_id=user.id,
            type_="moderation_status",
            deduplication_key=f"moderation:{index}",
            payload={"title": f"Obaveštenje {index}"},
            event_id=f"event:{index}",
        )
        item.last_event_at = datetime.now(UTC) + timedelta(seconds=index)
        created.append(item)
    foreign = service.create(
        recipient_id=other.id,
        type_="moderation_status",
        deduplication_key="foreign",
    )
    db.commit()

    login_user(user)
    first = client.get("/api/v1/notifications", params={"limit": 2})
    assert first.status_code == 200
    assert len(first.json()["data"]) == 2
    cursor = first.json()["meta"]["next_cursor"]
    assert cursor
    second = client.get(
        "/api/v1/notifications",
        params={"limit": 2, "cursor": cursor},
    )
    assert second.status_code == 200
    assert len(second.json()["data"]) == 2
    assert {
        item["id"] for item in first.json()["data"]
    }.isdisjoint({item["id"] for item in second.json()["data"]})

    invalid = client.get(
        "/api/v1/notifications",
        params={"cursor": foreign.id},
    )
    assert invalid.status_code == 400

    marked = client.post("/api/v1/notifications/read-all")
    assert marked.status_code == 200
    assert marked.json()["data"]["marked_read"] == 4
    assert NotificationService(db).unread_count(user.id) == 0
    assert NotificationService(db).unread_count(other.id) == 1


def test_inaccessible_entity_uses_safe_fallback(client, db, factories, login_user):
    seller = factories.user()
    listing = factories.listing(seller, factories.category())
    item = NotificationService(db).create(
        recipient_id=seller.id,
        type_="listing_approved",
        deduplication_key=f"listing-approved:{listing.id}",
        entity_type="listing",
        entity_id=listing.id,
        payload={
            "title": f"Odobren je {listing.title}",
            "body": "Privatni detalji više ne smeju biti vidljivi.",
        },
    )
    listing.status = "deleted"
    db.commit()

    login_user(seller)
    response = client.get("/api/v1/notifications")
    assert response.status_code == 200
    serialized = next(row for row in response.json()["data"] if row["id"] == item.id)
    assert serialized["href"] is None
    assert serialized["is_accessible"] is False
    assert serialized["title"] == "Obaveštenje više nije dostupno"
    assert "Privatni detalji" not in serialized["body"]


def test_expiry_in_app_delivery_ignores_email_opt_out_and_retention_is_bounded(
    db, factories
):
    seller = factories.user()
    seller.profile.notify_listing_expiry = False
    listing = factories.listing(seller, factories.category())
    listing.expires_at = datetime.now(UTC) + timedelta(days=2)
    db.commit()

    assert send_listing_expiry_reminders(db) == 0
    item = db.scalar(
        select(UserNotification).where(
            UserNotification.recipient_id == seller.id,
            UserNotification.type == "listing_expiring",
        )
    )
    assert item
    assert listing.expiry_notice_sent_at is None
    assert send_listing_expiry_reminders(db) == 0
    assert (
        db.query(UserNotification)
        .filter(
            UserNotification.recipient_id == seller.id,
            UserNotification.type == "listing_expiring",
        )
        .count()
        == 1
    )

    item.last_event_at = datetime.now(UTC) - timedelta(days=181)
    for index in range(2):
        old = NotificationService(db).create(
            recipient_id=seller.id,
            type_="moderation_status",
            deduplication_key=f"old:{index}",
        )
        old.last_event_at = datetime.now(UTC) - timedelta(days=181)
    db.commit()

    assert delete_old_notifications(db, limit=2) == 2
    assert delete_old_notifications(db, limit=2) == 1
    assert delete_old_notifications(db, limit=2) == 0


def test_saved_search_worker_consolidates_matches_when_email_is_disabled(
    db, factories
):
    user = factories.user()
    user.profile.notify_saved_searches = False
    saved_search = SavedSearch(
        user_id=user.id,
        name="Feeder oprema",
        query="feeder",
        filters={},
        notification_enabled=True,
    )
    db.add(saved_search)
    db.commit()
    seller = factories.user()
    category = factories.category()
    factories.listing(seller, category, title="Feeder štap prvi")

    assert send_saved_search_digests(db) == 0
    item = db.scalar(
        select(UserNotification).where(
            UserNotification.recipient_id == user.id,
            UserNotification.type == "saved_search_matches",
        )
    )
    assert item
    assert item.group_count == 1

    factories.listing(seller, category, title="Feeder štap drugi")
    assert send_saved_search_digests(db) == 0
    db.refresh(item)
    assert item.group_count == 2
    assert (
        db.query(UserNotification)
        .filter(
            UserNotification.recipient_id == user.id,
            UserNotification.type == "saved_search_matches",
        )
        .count()
        == 1
    )
