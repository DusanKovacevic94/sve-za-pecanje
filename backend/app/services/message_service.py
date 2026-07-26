from datetime import UTC, datetime

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session, selectinload

from app.core.responses import api_error
from app.models.listing import PUBLIC_LISTING_STATUSES, Listing
from app.models.message import Conversation, Message
from app.models.user import User
from app.services.analytics_service import AnalyticsService
from app.services.conversation_safety_service import ConversationSafetyService
from app.services.notification_service import NotificationService


class MessageService:
    def __init__(self, db: Session):
        self.db = db

    def list_conversations(self, user: User) -> list[Conversation]:
        return list(
            self.db.scalars(
                select(Conversation)
                .options(
                    selectinload(Conversation.listing),
                    selectinload(Conversation.buyer).selectinload(User.profile),
                    selectinload(Conversation.seller).selectinload(User.profile),
                )
                .where((Conversation.buyer_id == user.id) | (Conversation.seller_id == user.id))
                .order_by(Conversation.last_message_at.desc().nullslast())
            ).all()
        )

    def get_latest_messages(self, conversation_ids: list[str]) -> dict[str, Message]:
        if not conversation_ids:
            return {}
        latest_created_at = (
            select(Message.conversation_id, func.max(Message.created_at).label("created_at"))
            .where(Message.conversation_id.in_(conversation_ids))
            .group_by(Message.conversation_id)
            .subquery()
        )
        messages = self.db.scalars(
            select(Message)
            .join(
                latest_created_at,
                and_(
                    Message.conversation_id == latest_created_at.c.conversation_id,
                    Message.created_at == latest_created_at.c.created_at,
                ),
            )
            .order_by(Message.created_at.desc())
        ).all()
        return {message.conversation_id: message for message in messages}

    def get_conversation(self, conversation_id: str, user: User, mark_read: bool = False) -> Conversation:
        conversation = self.db.scalar(
            select(Conversation)
            .options(
                selectinload(Conversation.listing),
                selectinload(Conversation.buyer).selectinload(User.profile),
                selectinload(Conversation.seller).selectinload(User.profile),
            )
            .where(Conversation.id == conversation_id)
        )
        if not conversation:
            raise api_error("NOT_FOUND", "Razgovor nije pronađen.", 404)
        if user.id not in {conversation.buyer_id, conversation.seller_id}:
            raise api_error("FORBIDDEN", "Nemate pristup ovom razgovoru.", 403)
        if mark_read:
            if user.id == conversation.buyer_id:
                conversation.buyer_unread_count = 0
            else:
                conversation.seller_unread_count = 0
            NotificationService(self.db).mark_entity_read(
                user.id,
                "conversation",
                conversation.id,
            )
            self.db.commit()
            self.db.refresh(conversation)
        return conversation

    def get_messages(self, conversation: Conversation, page: int = 1, page_size: int = 50) -> tuple[list[Message], int]:
        page = max(page, 1)
        page_size = min(max(page_size, 1), 100)
        base_query = select(Message).where(Message.conversation_id == conversation.id)
        total = self.db.scalar(select(func.count()).select_from(base_query.subquery())) or 0
        messages = self.db.scalars(
            base_query.order_by(Message.created_at.asc()).offset((page - 1) * page_size).limit(page_size)
        ).all()
        return list(messages), total

    def send_for_listing(self, listing_id: str, sender: User, body: str) -> Conversation:
        listing = self.db.get(Listing, listing_id)
        if not listing:
            raise api_error("NOT_FOUND", "Oglas nije pronađen.", 404)
        if listing.status not in PUBLIC_LISTING_STATUSES:
            raise api_error("LISTING_NOT_ACTIVE", "Oglas nije dostupan za poruke.", 400)
        if listing.seller_id == sender.id:
            raise api_error("VALIDATION_ERROR", "Ne možete poslati poruku za sopstveni oglas.", 400)
        if not listing.allow_messages:
            raise api_error("LISTING_NOT_ACTIVE", "Prodavac ne prima poruke za ovaj oglas.", 400)
        ConversationSafetyService(self.db).enforce_available(
            sender.id, listing.seller_id
        )
        conversation = self.db.scalar(
            select(Conversation).where(
                Conversation.listing_id == listing.id,
                Conversation.buyer_id == sender.id,
                Conversation.seller_id == listing.seller_id,
            )
        )
        if not conversation:
            conversation = Conversation(
                listing_id=listing.id,
                buyer_id=sender.id,
                seller_id=listing.seller_id,
            )
            self.db.add(conversation)
            self.db.flush()
            AnalyticsService(self.db).track(
                "conversation_started",
                sender.id,
                entity_type="conversation",
                entity_id=conversation.id,
                category_id=listing.category_id,
                properties={"listing_id": listing.id},
            )
        return self._append_message(conversation, sender, body, listing)

    def reply(self, conversation_id: str, sender: User, body: str) -> Conversation:
        conversation = self.get_conversation(conversation_id, sender)
        counterpart_id = (
            conversation.seller_id
            if sender.id == conversation.buyer_id
            else conversation.buyer_id
        )
        ConversationSafetyService(self.db).enforce_available(
            sender.id, counterpart_id
        )
        listing = self.db.get(Listing, conversation.listing_id)
        if listing and listing.status not in PUBLIC_LISTING_STATUSES:
            raise api_error("LISTING_NOT_ACTIVE", "Nije moguće poslati poruku za ovaj oglas.", 400)
        return self._append_message(conversation, sender, body, listing)

    def _append_message(
        self,
        conversation: Conversation,
        sender: User,
        body: str,
        listing: Listing | None,
    ) -> Conversation:
        now = datetime.now(UTC)
        message = Message(
            conversation_id=conversation.id,
            sender_id=sender.id,
            body=body,
        )
        self.db.add(message)
        self.db.flush()
        conversation.last_message_at = now
        if sender.id == conversation.buyer_id:
            conversation.seller_unread_count += 1
            recipient_id = conversation.seller_id
        else:
            conversation.buyer_unread_count += 1
            recipient_id = conversation.buyer_id
        if listing:
            listing.message_count += 1
        if not ConversationSafetyService(self.db).is_muted(
            conversation.id, recipient_id
        ):
            NotificationService(self.db).create(
                recipient_id=recipient_id,
                type_="new_message",
                deduplication_key=f"conversation:{conversation.id}",
                actor_id=sender.id,
                entity_type="conversation",
                entity_id=conversation.id,
                payload={
                    "title": f"Nova poruka od {sender.username}",
                    "body": "Otvorite razgovor da biste pročitali poruku.",
                },
                event_id=f"message:{message.id}",
                consolidate=True,
            )
        self.db.commit()
        self.db.refresh(conversation)
        return conversation


def _serialize_user(user: User, trust: dict | None = None) -> dict:
    profile = user.profile if user else None
    return {
        "id": user.id,
        "username": user.username,
        "display_name": profile.display_name if profile else None,
        "trust": trust,
    }


def _serialize_message(message: Message) -> dict:
    return {
        "id": message.id,
        "sender_id": message.sender_id,
        "body": message.body,
        "read_at": message.read_at,
        "created_at": message.created_at,
    }


def serialize_conversation(
    conversation: Conversation,
    viewer: User,
    messages: list[Message] | None = None,
    total_messages: int | None = None,
    page: int = 1,
    page_size: int = 50,
    trust_summaries: dict[str, dict] | None = None,
    is_muted: bool = False,
    conversation_available: bool = True,
    blocked_by_viewer: bool = False,
) -> dict:
    message_rows = messages if messages is not None else []
    counterpart = conversation.seller if viewer.id == conversation.buyer_id else conversation.buyer
    unread_count = conversation.buyer_unread_count if viewer.id == conversation.buyer_id else conversation.seller_unread_count
    total = total_messages if total_messages is not None else len(message_rows)
    total_pages = max((total + page_size - 1) // page_size, 1)
    return {
        "id": conversation.id,
        "listing_id": conversation.listing_id,
        "listing": {
            "id": conversation.listing.id,
            "title": conversation.listing.title,
            "slug": conversation.listing.slug,
            "status": conversation.listing.status,
            "price_type": conversation.listing.price_type,
            "price_amount": conversation.listing.price_amount,
            "currency": conversation.listing.currency,
            "delivery_methods": conversation.listing.delivery_methods,
            "delivery_note": conversation.listing.delivery_note,
            "reserved_at": conversation.listing.reserved_at,
        },
        "buyer_id": conversation.buyer_id,
        "seller_id": conversation.seller_id,
        "buyer": _serialize_user(
            conversation.buyer,
            (trust_summaries or {}).get(conversation.buyer_id),
        ),
        "seller": _serialize_user(
            conversation.seller,
            (trust_summaries or {}).get(conversation.seller_id),
        ),
        "counterpart": _serialize_user(
            counterpart,
            (trust_summaries or {}).get(counterpart.id),
        ),
        "last_message_at": conversation.last_message_at,
        "buyer_unread_count": conversation.buyer_unread_count,
        "seller_unread_count": conversation.seller_unread_count,
        "unread_count": unread_count,
        "is_muted": is_muted,
        "conversation_available": conversation_available,
        "blocked_by_viewer": blocked_by_viewer,
        "messages": [_serialize_message(message) for message in message_rows],
        "messages_meta": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": total_pages,
        },
    }
