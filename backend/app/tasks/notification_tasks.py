from datetime import UTC, datetime, timedelta

from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.listing import Listing
from app.models.message import Conversation, Message
from app.models.user import User
from app.services.email_service import EmailService
from app.services.notification_service import NotificationService

MESSAGE_EMAIL_DELAY = timedelta(minutes=10)
MESSAGE_EMAIL_COOLDOWN = timedelta(hours=12)
EXPIRY_NOTICE_WINDOW = timedelta(days=3)


def send_unread_message_notifications(db: Session, limit: int = 100) -> int:
    now = datetime.now(UTC)
    cutoff = now - MESSAGE_EMAIL_DELAY
    conversations = db.scalars(
        select(Conversation)
        .options(
            selectinload(Conversation.listing),
            selectinload(Conversation.buyer).selectinload(User.profile),
            selectinload(Conversation.seller).selectinload(User.profile),
        )
        .where(
            Conversation.last_message_at.is_not(None),
            Conversation.last_message_at <= cutoff,
            or_(Conversation.buyer_unread_count > 0, Conversation.seller_unread_count > 0),
        )
        .limit(limit)
    ).all()
    sent = 0
    for conversation in conversations:
        sent += _maybe_send_message_email(db, conversation, "buyer", now)
        sent += _maybe_send_message_email(db, conversation, "seller", now)
    if sent:
        db.commit()
    return sent


def _maybe_send_message_email(db: Session, conversation: Conversation, side: str, now: datetime) -> int:
    recipient = conversation.buyer if side == "buyer" else conversation.seller
    unread_count = conversation.buyer_unread_count if side == "buyer" else conversation.seller_unread_count
    sent_at = (
        conversation.buyer_message_email_sent_at
        if side == "buyer"
        else conversation.seller_message_email_sent_at
    )
    if unread_count <= 0 or not recipient or not NotificationService.can_send_message_email(recipient):
        return 0
    if sent_at and _as_utc(sent_at) > now - MESSAGE_EMAIL_COOLDOWN:
        return 0
    latest_unnotified = db.scalar(
        select(Message)
        .where(
            Message.conversation_id == conversation.id,
            Message.sender_id != recipient.id,
            Message.notification_email_sent_at.is_(None),
        )
        .order_by(Message.created_at.desc())
    )
    if not latest_unnotified:
        return 0
    sender = db.get(User, latest_unnotified.sender_id)
    EmailService(db).send_new_message(
        recipient,
        conversation.listing.title if conversation.listing else "oglas",
        sender.username if sender else "Korisnik",
    )
    latest_unnotified.notification_email_sent_at = now
    if side == "buyer":
        conversation.buyer_message_email_sent_at = now
    else:
        conversation.seller_message_email_sent_at = now
    return 1


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def send_listing_expiry_reminders(db: Session, limit: int = 100) -> int:
    now = datetime.now(UTC)
    upper = now + EXPIRY_NOTICE_WINDOW
    listings = db.scalars(
        select(Listing)
        .options(selectinload(Listing.seller).selectinload(User.profile))
        .where(
            Listing.status == "active",
            Listing.expires_at.is_not(None),
            Listing.expires_at <= upper,
            Listing.expires_at > now,
            Listing.expiry_notice_sent_at.is_(None),
        )
        .limit(limit)
    ).all()
    sent = 0
    for listing in listings:
        seller = listing.seller
        if not seller or not NotificationService.can_send_listing_expiry_email(seller):
            continue
        EmailService(db).send_listing_expiring(seller, listing.id, listing.title)
        listing.expiry_notice_sent_at = now
        sent += 1
    if sent:
        db.commit()
    return sent
