from datetime import datetime

from pydantic import BaseModel, EmailStr


class PublicSeller(BaseModel):
    id: str
    username: str
    display_name: str | None = None
    city: str | None = None
    member_since: datetime
    phone_visible: bool = False
    rating: float | None = None


class ProfileUpdate(BaseModel):
    display_name: str | None = None
    city: str | None = None
    municipality: str | None = None
    phone_number: str | None = None
    phone_visible: bool | None = None
    bio: str | None = None
    fishing_styles: list[str] | None = None
    notify_messages: bool | None = None
    notify_saved_searches: bool | None = None
    notify_listing_expiry: bool | None = None


class UserListItem(BaseModel):
    id: str
    email: EmailStr
    username: str
    role: str
    status: str
    created_at: datetime
