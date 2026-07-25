from typing import Literal

from pydantic import BaseModel

NotificationType = Literal[
    "new_message",
    "listing_approved",
    "listing_rejected",
    "listing_expiring",
    "listing_expired",
    "listing_reserved",
    "listing_sold",
    "saved_search_matches",
    "review_received",
    "promotion_status",
    "shop_subscription_status",
    "moderation_status",
]


class NotificationOut(BaseModel):
    id: str
    type: NotificationType
    title: str
    body: str
    href: str | None
    is_accessible: bool
    group_count: int
    read_at: str | None
    created_at: str
    last_event_at: str
