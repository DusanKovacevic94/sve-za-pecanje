from pydantic import BaseModel, Field


class SavedSearchCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    query: str | None = Field(default=None, max_length=255)
    filters: dict = Field(default_factory=dict)
    notification_enabled: bool = True


class SavedSearchOut(BaseModel):
    id: str
    name: str
    query: str | None
    filters: dict
    notification_enabled: bool
    matching_count: int = 0

