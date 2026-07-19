from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user
from app.core.rate_limit import check_rate_limit
from app.core.responses import data_response
from app.db.session import get_db
from app.models.user import User
from app.models.message import Conversation
from app.schemas.message import MessageCreate
from app.services.message_service import MessageService, serialize_conversation

router = APIRouter(tags=["messages"])


@router.get("/conversations")
def list_conversations(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    service = MessageService(db)
    conversations = service.list_conversations(user)
    latest_messages = service.get_latest_messages([conversation.id for conversation in conversations])
    return data_response(
        [
            serialize_conversation(
                conversation,
                user,
                messages=[latest_messages[conversation.id]] if conversation.id in latest_messages else [],
                total_messages=1 if conversation.id in latest_messages else 0,
                page=1,
                page_size=1,
            )
            for conversation in conversations
        ]
    )


@router.get("/conversations/{conversation_id}")
def get_conversation(
    conversation_id: str,
    page: int = 1,
    page_size: int = 50,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = MessageService(db)
    conversation = service.get_conversation(conversation_id, user, mark_read=True)
    messages, total = service.get_messages(conversation, page=page, page_size=page_size)
    return data_response(
        serialize_conversation(
            conversation,
            user,
            messages=messages,
            total_messages=total,
            page=max(page, 1),
            page_size=min(max(page_size, 1), 100),
        )
    )


@router.post("/listings/{listing_id}/messages")
def send_listing_message(
    listing_id: str,
    payload: MessageCreate,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_rate_limit(request, f"message:{user.id}", 20, 60 * 60)
    existing = db.scalar(
        select(Conversation.id).where(
            Conversation.listing_id == listing_id,
            Conversation.buyer_id == user.id,
        )
    )
    if not existing:
        from app.services.risk_service import RiskService

        risk = RiskService(db)
        risk.enforce(
            "first_message",
            request,
            user.id,
            payload.turnstile_token,
            "user",
            user.id,
        )
        risk.record_action("first_message", request, user.id, "listing", listing_id)
    conversation = MessageService(db).send_for_listing(listing_id, user, payload.body)
    return data_response(serialize_conversation(conversation, user))


@router.post("/conversations/{conversation_id}/messages")
def reply_message(
    conversation_id: str,
    payload: MessageCreate,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_rate_limit(request, f"message:{user.id}", 20, 60 * 60)
    conversation = MessageService(db).reply(conversation_id, user, payload.body)
    return data_response(serialize_conversation(conversation, user))
