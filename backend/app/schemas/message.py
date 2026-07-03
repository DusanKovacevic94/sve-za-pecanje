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


class MessageUserOut(BaseModel):
    id: str
    username: str
    display_name: str | None = None


class MessageListingOut(BaseModel):
    id: str
    title: str
    slug: str
    status: str


class MessagePageMeta(BaseModel):
    page: int
    page_size: int
    total: int
    total_pages: int


class ConversationOut(BaseModel):
    id: str
    listing_id: str
    listing: MessageListingOut
    buyer_id: str
    seller_id: str
    buyer: MessageUserOut
    seller: MessageUserOut
    counterpart: MessageUserOut
    last_message_at: datetime | None
    buyer_unread_count: int
    seller_unread_count: int
    unread_count: int
    messages: list[MessageOut] = []
    messages_meta: MessagePageMeta
