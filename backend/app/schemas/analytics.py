from typing import Literal

from pydantic import BaseModel, Field, field_validator


class SearchEventProperties(BaseModel):
    query: str | None = Field(default=None, max_length=160)
    result_count: int = Field(ge=0, le=1_000_000)
    filter_count: int = Field(default=0, ge=0, le=100)
    page: int = Field(default=1, ge=1, le=10_000)

    @field_validator("query")
    @classmethod
    def strip_query(cls, value: str | None) -> str | None:
        normalized = " ".join((value or "").split())
        return normalized or None


class PublicAnalyticsEventCreate(BaseModel):
    client_event_id: str = Field(min_length=16, max_length=80, pattern=r"^[A-Za-z0-9_-]+$")
    event_name: Literal["search_performed"]
    anonymous_id: str = Field(min_length=16, max_length=100, pattern=r"^[A-Za-z0-9_-]+$")
    category_id: str | None = Field(default=None, max_length=36)
    properties: SearchEventProperties
