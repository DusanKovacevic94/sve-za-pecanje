from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user
from app.core.rate_limit import check_rate_limit
from app.core.responses import data_response
from app.db.session import get_db
from app.models.user import User
from app.schemas.message import MessageCreate
from app.services.message_service import MessageService, serialize_conversation

router = APIRouter(tags=["messages"])


@router.get("/conversations")
def list_conversations(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conversations = MessageService(db).list_conversations(user)
    return data_response([serialize_conversation(conversation) for conversation in conversations])


@router.get("/conversations/{conversation_id}")
def get_conversation(
    conversation_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return data_response(serialize_conversation(MessageService(db).get_conversation(conversation_id, user)))


@router.post("/listings/{listing_id}/messages")
def send_listing_message(
    listing_id: str,
    payload: MessageCreate,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_rate_limit(request, f"message:{user.id}", 20, 60 * 60)
    conversation = MessageService(db).send_for_listing(listing_id, user, payload.body)
    return data_response(serialize_conversation(conversation))


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
    return data_response(serialize_conversation(conversation))

