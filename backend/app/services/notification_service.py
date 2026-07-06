from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_token
from app.models.profile import UserProfile
from app.models.user import User


class NotificationService:
    def __init__(self, db: Session):
        self.db = db

    def unsubscribe_all_email(self, token: str) -> User:
        user = self.db.scalar(select(User).where(User.email_unsubscribe_token_hash == hash_token(token)))
        if not user:
            from app.core.responses import api_error

            raise api_error("NOT_FOUND", "Link za odjavu nije ispravan.", 404)
        if not user.profile:
            user.profile = UserProfile(display_name=user.username)
        user.profile.notify_messages = False
        user.profile.notify_saved_searches = False
        user.profile.notify_listing_expiry = False
        user.email_unsubscribe_token_hash = None
        self.db.commit()
        self.db.refresh(user)
        return user

    @staticmethod
    def can_send_message_email(user: User) -> bool:
        return bool(not user.profile or user.profile.notify_messages)

    @staticmethod
    def can_send_saved_search_email(user: User) -> bool:
        return bool(not user.profile or user.profile.notify_saved_searches)

    @staticmethod
    def can_send_listing_expiry_email(user: User) -> bool:
        return bool(not user.profile or user.profile.notify_listing_expiry)

    @staticmethod
    def utcnow() -> datetime:
        return datetime.now(UTC)
