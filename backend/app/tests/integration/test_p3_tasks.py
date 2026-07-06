from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.models import AuditLog, EmailOutbox, Favorite, Report
from app.models.message import Message
from app.services.feature_service import FeatureService
from app.services.message_service import MessageService
from app.services.moderation_service import ModerationService
from app.tasks.notification_tasks import send_listing_expiry_reminders, send_unread_message_notifications


def test_message_service_unread_counts_and_authorization(db, factories):
    seller = factories.user()
    buyer = factories.user()
    outsider = factories.user()
    category = factories.category()
    listing = factories.listing(seller, category)

    conversation = MessageService(db).send_for_listing(listing.id, buyer, "Da li je stap dostupan?")

    assert conversation.seller_unread_count == 1
    assert conversation.buyer_unread_count == 0

    loaded = MessageService(db).get_conversation(conversation.id, seller, mark_read=True)
    assert loaded.seller_unread_count == 0

    try:
        MessageService(db).get_conversation(conversation.id, outsider)
    except Exception as exc:
        assert getattr(exc, "status_code") == 403
    else:
        raise AssertionError("outsider should not access conversation")


def test_favorites_and_reports(client, db, factories, login_user):
    seller = factories.user()
    buyer = factories.user()
    listing = factories.listing(seller, factories.category())
    login_user(buyer)

    response = client.post(f"/api/v1/listings/{listing.id}/favorite")
    assert response.status_code == 200
    assert db.scalar(select(Favorite).where(Favorite.user_id == buyer.id, Favorite.listing_id == listing.id))

    response = client.post(
        f"/api/v1/listings/{listing.id}/report",
        json={"reason": "scam", "description": "Sumnjiv oglas"},
    )
    assert response.status_code == 200
    report = db.scalar(select(Report).where(Report.reporter_id == buyer.id, Report.listing_id == listing.id))
    assert report and report.status == "open"


def test_moderation_approve_reject_suspend_audits(db, factories):
    admin = factories.user(role="admin")
    seller = factories.user()
    category = factories.category()
    listing = factories.listing(seller, category, status="pending_review")

    service = ModerationService(db)
    approved = service.approve_listing(listing.id, admin)
    assert approved.status == "active"

    rejected = service.reject_listing(listing.id, admin, "Loše fotografije")
    assert rejected.status == "rejected"

    suspended = service.suspend_user(seller.id, admin, "test")
    assert suspended.status == "suspended"
    actions = {row.action for row in db.scalars(select(AuditLog)).all()}
    assert {"listing.approved", "listing.rejected", "user.suspended"} <= actions


def test_feature_request_flow_sets_featured_until(db, factories):
    seller = factories.user()
    admin = factories.user(role="admin")
    listing = factories.listing(seller, factories.category())

    request = FeatureService(db).create_request(listing.id, seller, 7)
    assert request.status == "pending"
    assert request.payment_reference.startswith("IST-")

    approved = FeatureService(db).approve(request.id, admin)
    db.refresh(listing)
    assert approved.status == "paid"
    assert listing.is_featured is True
    assert listing.featured_until is not None
    assert db.scalar(select(EmailOutbox).where(EmailOutbox.to_email == seller.email))


def test_unread_message_notification_batches(db, factories):
    seller = factories.user()
    buyer = factories.user()
    listing = factories.listing(seller, factories.category())
    conversation = MessageService(db).send_for_listing(listing.id, buyer, "Pozdrav")
    conversation.last_message_at = datetime.now(UTC) - timedelta(minutes=15)
    db.commit()

    assert send_unread_message_notifications(db) == 1
    assert send_unread_message_notifications(db) == 0
    assert db.scalar(select(EmailOutbox).where(EmailOutbox.to_email == seller.email))
    assert db.scalar(select(Message).where(Message.notification_email_sent_at.is_not(None)))


def test_listing_expiry_notification_and_opt_out(db, factories):
    seller = factories.user()
    seller.profile.notify_listing_expiry = False
    listing = factories.listing(seller, factories.category())
    listing.expires_at = datetime.now(UTC) + timedelta(days=2)
    db.commit()

    assert send_listing_expiry_reminders(db) == 0

    seller.profile.notify_listing_expiry = True
    db.commit()
    assert send_listing_expiry_reminders(db) == 1
    assert send_listing_expiry_reminders(db) == 0
