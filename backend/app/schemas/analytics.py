from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class SearchEventProperties(BaseModel):
    query: str | None = Field(default=None, max_length=160)
    result_count: int | None = Field(default=None, ge=0, le=1_000_000)
    filter_count: int = Field(default=0, ge=0, le=100)
    page: int = Field(default=1, ge=1, le=10_000)
    query_length: int | None = Field(default=None, ge=0, le=160)
    suggestion_types: list[
        Literal["category", "brand", "common_query", "listing"]
    ] = Field(default_factory=list, max_length=4)
    suggestion_count: int | None = Field(default=None, ge=0, le=12)
    suggestion_type: Literal[
        "category", "brand", "common_query", "listing"
    ] | None = None
    position: int | None = Field(default=None, ge=0, le=11)
    recovery_action: Literal[
        "spelling",
        "remove_filter",
        "related_category",
        "recent_listing",
        "save_search",
    ] | None = None
    removed_filter: str | None = Field(default=None, max_length=80)

    @field_validator("query")
    @classmethod
    def strip_query(cls, value: str | None) -> str | None:
        normalized = " ".join((value or "").split())
        return normalized or None


class PublicAnalyticsEventCreate(BaseModel):
    client_event_id: str = Field(min_length=16, max_length=80, pattern=r"^[A-Za-z0-9_-]+$")
    event_name: Literal[
        "search_performed",
        "suggestion_impression",
        "suggestion_selected",
        "zero_result_recovery",
    ]
    anonymous_id: str = Field(min_length=16, max_length=100, pattern=r"^[A-Za-z0-9_-]+$")
    category_id: str | None = Field(default=None, max_length=36)
    properties: SearchEventProperties

    @model_validator(mode="after")
    def validate_event_properties(self) -> "PublicAnalyticsEventCreate":
        if self.event_name == "search_performed" and self.properties.result_count is None:
            raise ValueError("Broj rezultata je obavezan za praćenje pretrage.")
        if self.event_name == "suggestion_selected" and (
            self.properties.suggestion_type is None
            or self.properties.position is None
        ):
            raise ValueError("Tip i pozicija predloga su obavezni.")
        if (
            self.event_name == "zero_result_recovery"
            and self.properties.recovery_action is None
        ):
            raise ValueError("Akcija oporavka je obavezna.")
        return self
