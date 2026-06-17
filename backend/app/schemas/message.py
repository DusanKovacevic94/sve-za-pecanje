from datetime import datetime

from pydantic import BaseModel, Field


class MessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=3000)


class MessageOut(BaseModel):
    id: str
    sender_id: str
    body: str
    read_at: datetime | None
    created_at: datetime


class ConversationOut(BaseModel):
    id: str
    listing_id: str
    buyer_id: str
    seller_id: str
    last_message_at: datetime | None
    buyer_unread_count: int
    seller_unread_count: int
    messages: list[MessageOut] = []

