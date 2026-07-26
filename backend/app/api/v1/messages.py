from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user
from app.core.rate_limit import check_rate_limit
from app.core.responses import data_response
from app.db.session import get_db
from app.models.user import User
from app.models.message import Conversation
from app.schemas.message import (
    ConversationPreferenceUpdate,
    ConversationReportCreate,
    MessageCreate,
)
from app.services.conversation_safety_service import ConversationSafetyService
from app.services.message_service import MessageService, serialize_conversation
from app.services.trust_service import factual_trust_summaries

router = APIRouter(tags=["messages"])


@router.get("/conversations")
def list_conversations(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    service = MessageService(db)
    safety = ConversationSafetyService(db)
    conversations = service.list_conversations(user)
    conversation_users = {
        item.id: item
        for conversation in conversations
        for item in (conversation.buyer, conversation.seller)
    }
    trust_summaries = factual_trust_summaries(
        db,
        list(conversation_users.values()),
    )
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
                trust_summaries=trust_summaries,
                is_muted=safety.is_muted(conversation.id, user.id),
                conversation_available=safety.is_available_between(
                    conversation.buyer_id, conversation.seller_id
                ),
                blocked_by_viewer=safety.blocked_by(
                    user.id, safety.counterpart_id(conversation, user.id)
                ),
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
    safety = ConversationSafetyService(db)
    conversation = service.get_conversation(conversation_id, user, mark_read=True)
    messages, total = service.get_messages(conversation, page=page, page_size=page_size)
    trust_summaries = factual_trust_summaries(
        db,
        [conversation.buyer, conversation.seller],
    )
    return data_response(
        serialize_conversation(
            conversation,
            user,
            messages=messages,
            total_messages=total,
            page=max(page, 1),
            page_size=min(max(page_size, 1), 100),
            trust_summaries=trust_summaries,
            is_muted=safety.is_muted(conversation.id, user.id),
            conversation_available=safety.is_available_between(
                conversation.buyer_id, conversation.seller_id
            ),
            blocked_by_viewer=safety.blocked_by(
                user.id, safety.counterpart_id(conversation, user.id)
            ),
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
    trust_summaries = factual_trust_summaries(
        db,
        [conversation.buyer, conversation.seller],
    )
    return data_response(
        serialize_conversation(
            conversation,
            user,
            trust_summaries=trust_summaries,
        )
    )


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
    trust_summaries = factual_trust_summaries(
        db,
        [conversation.buyer, conversation.seller],
    )
    return data_response(
        serialize_conversation(
            conversation,
            user,
            trust_summaries=trust_summaries,
        )
    )


@router.patch("/conversations/{conversation_id}/preferences")
def update_conversation_preferences(
    conversation_id: str,
    payload: ConversationPreferenceUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    preference = ConversationSafetyService(db).set_muted(
        conversation_id, user, payload.muted
    )
    return data_response({"muted": bool(preference.muted_at)})


@router.post("/conversations/{conversation_id}/block")
def block_conversation_user(
    conversation_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ConversationSafetyService(db).block(conversation_id, user)
    return data_response(
        {
            "conversation_available": False,
            "blocked_by_viewer": True,
        }
    )


@router.delete("/conversations/{conversation_id}/block")
def unblock_conversation_user(
    conversation_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    safety = ConversationSafetyService(db)
    conversation = safety.get_participant_conversation(conversation_id, user.id)
    safety.unblock(conversation_id, user)
    return data_response(
        {
            "conversation_available": safety.is_available_between(
                conversation.buyer_id, conversation.seller_id
            ),
            "blocked_by_viewer": False,
        }
    )


@router.post("/conversations/{conversation_id}/reports")
def report_conversation(
    conversation_id: str,
    payload: ConversationReportCreate,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_rate_limit(request, f"conversation-report:{user.id}", 10, 24 * 60 * 60)
    report = ConversationSafetyService(db).report(
        conversation_id,
        user,
        reason=payload.reason,
        explanation=payload.explanation,
        message_id=payload.message_id,
    )
    return data_response({"id": report.id, "status": "submitted"})
