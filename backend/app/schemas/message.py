from datetime import datetime

from typing import Literal

from pydantic import BaseModel, Field, model_validator


class MessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=3000)
    turnstile_token: str | None = Field(default=None, max_length=2048)


class ConversationPreferenceUpdate(BaseModel):
    muted: bool


class ConversationReportCreate(BaseModel):
    reason: Literal[
        "spam",
        "harassment",
        "scam",
        "off_platform_payment",
        "inappropriate_content",
        "other",
    ]
    explanation: str | None = Field(default=None, max_length=1500)
    message_id: str | None = Field(default=None, max_length=36)

    @model_validator(mode="after")
    def require_other_explanation(self) -> "ConversationReportCreate":
        if self.reason == "other" and not (self.explanation or "").strip():
            raise ValueError("Opišite razlog prijave.")
        return self


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
    is_muted: bool
    conversation_available: bool
    blocked_by_viewer: bool
    messages: list[MessageOut] = []
    messages_meta: MessagePageMeta
