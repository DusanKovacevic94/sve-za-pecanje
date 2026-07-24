from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class SearchSuggestionOut(BaseModel):
    id: str
    type: Literal["category", "brand", "common_query", "listing"]
    display: str
    value: str
    href: str
    description: str | None = None
    source: Literal["catalog", "dynamic", "curated", "listing"]


class SearchBlacklistCreate(BaseModel):
    term: str = Field(min_length=2, max_length=160)

    @field_validator("term")
    @classmethod
    def normalize_spaces(cls, value: str) -> str:
        return " ".join(value.split())


class SearchBlacklistOut(BaseModel):
    id: str
    term_normalized: str
    created_at: datetime
