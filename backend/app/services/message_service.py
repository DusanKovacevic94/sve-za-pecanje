from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.responses import api_error
from app.models.listing import Listing
from app.models.message import Conversation, Message
from app.models.user import User
from app.services.email_service import EmailService


class MessageService:
    def __init__(self, db: Session):
        self.db = db

    def list_conversations(self, user: User) -> list[Conversation]:
        return list(
            self.db.scalars(
                select(Conversation)
                .options(selectinload(Conversation.messages))
                .where((Conversation.buyer_id == user.id) | (Conversation.seller_id == user.id))
                .order_by(Conversation.last_message_at.desc().nullslast())
            ).all()
        )

    def get_conversation(self, conversation_id: str, user: User) -> Conversation:
        conversation = self.db.scalar(
            select(Conversation)
            .options(selectinload(Conversation.messages))
            .where(Conversation.id == conversation_id)
        )
        if not conversation:
            raise api_error("NOT_FOUND", "Razgovor nije pronađen.", 404)
        if user.id not in {conversation.buyer_id, conversation.seller_id}:
            raise api_error("FORBIDDEN", "Nemate pristup ovom razgovoru.", 403)
        return conversation

    def send_for_listing(self, listing_id: str, sender: User, body: str) -> Conversation:
        listing = self.db.get(Listing, listing_id)
        if not listing:
            raise api_error("NOT_FOUND", "Oglas nije pronađen.", 404)
        if listing.status == "sold":
            raise api_error("LISTING_NOT_ACTIVE", "Ovaj oglas je označen kao prodat.", 400)
        if listing.seller_id == sender.id:
            raise api_error("VALIDATION_ERROR", "Ne možete poslati poruku za sopstveni oglas.", 400)
        if not listing.allow_messages:
            raise api_error("LISTING_NOT_ACTIVE", "Prodavac ne prima poruke za ovaj oglas.", 400)
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
        return self._append_message(conversation, sender, body, listing)

    def reply(self, conversation_id: str, sender: User, body: str) -> Conversation:
        conversation = self.get_conversation(conversation_id, sender)
        listing = self.db.get(Listing, conversation.listing_id)
        if listing and listing.status in {"sold", "archived", "deleted"}:
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
        self.db.add(Message(conversation_id=conversation.id, sender_id=sender.id, body=body))
        conversation.last_message_at = now
        if sender.id == conversation.buyer_id:
            conversation.seller_unread_count += 1
        else:
            conversation.buyer_unread_count += 1
        if listing:
            listing.message_count += 1
            recipient = self.db.get(User, conversation.seller_id if sender.id == conversation.buyer_id else conversation.buyer_id)
            if recipient:
                EmailService().send_new_message(recipient.email, listing.title, sender.username)
        self.db.commit()
        self.db.refresh(conversation)
        return conversation


def serialize_conversation(conversation: Conversation) -> dict:
    return {
        "id": conversation.id,
        "listing_id": conversation.listing_id,
        "buyer_id": conversation.buyer_id,
        "seller_id": conversation.seller_id,
        "last_message_at": conversation.last_message_at,
        "buyer_unread_count": conversation.buyer_unread_count,
        "seller_unread_count": conversation.seller_unread_count,
        "messages": [
            {
                "id": message.id,
                "sender_id": message.sender_id,
                "body": message.body,
                "read_at": message.read_at,
                "created_at": message.created_at,
            }
            for message in conversation.messages
        ],
    }

