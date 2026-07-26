from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select

from app.models.conversation_safety import (
    ConversationReport,
    UserBlock,
)
from app.models.message import Conversation, Message
from app.models.moderation_case import ModerationCase
from app.models.notification import UserNotification
from app.services.email_service import EmailService
from app.tasks.notification_tasks import send_unread_message_notifications


def _start_conversation(client, listing_id: str) -> str:
    response = client.post(
        f"/api/v1/listings/{listing_id}/messages",
        json={"body": "Da li je oprema još dostupna?"},
    )
    assert response.status_code == 200
    return response.json()["data"]["id"]


def test_block_is_generic_bidirectional_and_cannot_be_bypassed_with_another_listing(
    client, db, factories, login_user
):
    seller = factories.user()
    buyer = factories.user()
    category = factories.category()
    first_listing = factories.listing(seller, category)
    second_listing = factories.listing(seller, category)

    login_user(buyer)
    conversation_id = _start_conversation(client, first_listing.id)
    login_user(seller)
    blocked = client.post(f"/api/v1/conversations/{conversation_id}/block")
    assert blocked.status_code == 200
    assert db.scalar(select(func.count(UserBlock.id))) == 1

    for actor in (seller, buyer):
        login_user(actor)
        reply = client.post(
            f"/api/v1/conversations/{conversation_id}/messages",
            json={"body": "Ova poruka ne sme proći."},
        )
        assert reply.status_code == 403
        assert reply.json()["error"]["code"] == "conversation_unavailable"
        assert reply.json()["error"]["message"] == "Razgovor trenutno nije dostupan."

    login_user(buyer)
    bypass = client.post(
        f"/api/v1/listings/{second_listing.id}/messages",
        json={"body": "Pokušaj preko drugog oglasa."},
    )
    assert bypass.status_code == 403
    assert bypass.json()["error"]["code"] == "conversation_unavailable"
    detail = client.get(f"/api/v1/listings/{second_listing.slug}")
    assert detail.status_code == 200
    assert detail.json()["data"]["can_message"] is False

    buyer_view = client.get(f"/api/v1/conversations/{conversation_id}").json()["data"]
    assert buyer_view["conversation_available"] is False
    assert buyer_view["blocked_by_viewer"] is False
    assert len(buyer_view["messages"]) == 1

    login_user(seller)
    seller_view = client.get(f"/api/v1/conversations/{conversation_id}").json()["data"]
    assert seller_view["conversation_available"] is False
    assert seller_view["blocked_by_viewer"] is True
    unblocked = client.delete(f"/api/v1/conversations/{conversation_id}/block")
    assert unblocked.status_code == 200
    assert unblocked.json()["data"]["conversation_available"] is True

    login_user(buyer)
    assert _start_conversation(client, second_listing.id)


def test_mute_is_private_and_suppresses_in_app_and_email_notifications(
    client, db, factories, login_user, monkeypatch
):
    seller = factories.user()
    buyer = factories.user()
    listing = factories.listing(seller, factories.category())
    login_user(buyer)
    conversation_id = _start_conversation(client, listing.id)
    original_notification = db.scalar(
        select(UserNotification).where(
            UserNotification.recipient_id == seller.id,
            UserNotification.entity_id == conversation_id,
        )
    )
    assert original_notification
    assert original_notification.group_count == 1

    login_user(seller)
    muted = client.patch(
        f"/api/v1/conversations/{conversation_id}/preferences",
        json={"muted": True},
    )
    assert muted.status_code == 200
    assert muted.json()["data"]["muted"] is True

    login_user(buyer)
    sent = client.post(
        f"/api/v1/conversations/{conversation_id}/messages",
        json={"body": "Druga poruka u utišanom razgovoru."},
    )
    assert sent.status_code == 200
    db.refresh(original_notification)
    assert original_notification.group_count == 1

    buyer_view = client.get(f"/api/v1/conversations/{conversation_id}").json()["data"]
    assert buyer_view["is_muted"] is False
    login_user(seller)
    seller_view = client.get(f"/api/v1/conversations/{conversation_id}").json()["data"]
    assert seller_view["is_muted"] is True

    conversation = db.get(Conversation, conversation_id)
    conversation.last_message_at = datetime.now(UTC) - timedelta(minutes=20)
    db.commit()
    deliveries = []
    monkeypatch.setattr(
        EmailService,
        "send_new_message",
        lambda *args, **kwargs: deliveries.append((args, kwargs)),
    )
    assert send_unread_message_notifications(db) == 0
    assert deliveries == []


def test_message_report_preserves_evidence_and_creates_exactly_one_case(
    client, db, factories, login_user
):
    admin = factories.user(role="admin")
    seller = factories.user()
    buyer = factories.user()
    intruder = factories.user()
    listing = factories.listing(seller, factories.category())
    login_user(buyer)
    conversation_id = _start_conversation(client, listing.id)
    login_user(seller)
    reply = client.post(
        f"/api/v1/conversations/{conversation_id}/messages",
        json={"body": "Uplati odmah van platforme na ovaj račun."},
    )
    assert reply.status_code == 200
    message = db.scalar(
        select(Message)
        .where(
            Message.conversation_id == conversation_id,
            Message.sender_id == seller.id,
        )
        .order_by(Message.created_at.desc())
    )
    assert message

    login_user(intruder)
    unauthorized = client.post(
        f"/api/v1/conversations/{conversation_id}/reports",
        json={"reason": "scam", "message_id": message.id},
    )
    assert unauthorized.status_code == 403

    login_user(buyer)
    reported = client.post(
        f"/api/v1/conversations/{conversation_id}/reports",
        json={
            "reason": "off_platform_payment",
            "explanation": "Traži uplatu unapred.",
            "message_id": message.id,
        },
    )
    assert reported.status_code == 200
    report = db.get(ConversationReport, reported.json()["data"]["id"])
    assert report
    assert report.content_snapshot["target_message"]["body"] == message.body
    assert report.content_snapshot["listing"]["id"] == listing.id
    assert report.content_snapshot["reported_account"]["id"] == seller.id
    assert db.scalar(select(func.count(ModerationCase.id))) == 1
    case = db.get(ModerationCase, report.moderation_case_id)
    assert case and case.entity_id == report.id

    db.delete(message)
    db.commit()
    db.refresh(report)
    assert (
        report.content_snapshot["target_message"]["body"]
        == "Uplati odmah van platforme na ovaj račun."
    )

    login_user(admin)
    queue = client.get(
        "/api/v1/admin/moderation-cases",
        params={"entity_type": "conversation_report"},
    )
    assert queue.status_code == 200
    evidence = queue.json()["data"][0]["report_evidence"]
    assert evidence["reason"] == "off_platform_payment"
    assert evidence["message_level"] is True
    assert evidence["snapshot"]["target_message"]["body"].startswith("Uplati")
    impersonation = client.get(f"/api/v1/conversations/{conversation_id}")
    assert impersonation.status_code == 403


def test_suspended_participant_keeps_history_but_cannot_receive_new_messages(
    client, db, factories, login_user
):
    seller = factories.user()
    buyer = factories.user()
    listing = factories.listing(seller, factories.category())
    login_user(buyer)
    conversation_id = _start_conversation(client, listing.id)
    seller.status = "suspended"
    db.commit()

    history = client.get(f"/api/v1/conversations/{conversation_id}")
    assert history.status_code == 200
    assert history.json()["data"]["conversation_available"] is False
    assert len(history.json()["data"]["messages"]) == 1
    send = client.post(
        f"/api/v1/conversations/{conversation_id}/messages",
        json={"body": "Ne sme biti poslato suspendovanom nalogu."},
    )
    assert send.status_code == 403
    assert send.json()["error"]["code"] == "conversation_unavailable"
