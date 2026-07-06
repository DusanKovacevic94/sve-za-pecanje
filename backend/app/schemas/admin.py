from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class AdminDashboard(BaseModel):
    pending_listings: int
    active_listings: int
    new_users_last_7_days: int
    unresolved_reports: int
    messages_last_7_days: int
    listings_last_7_days: int


class RejectListingRequest(BaseModel):
    reason_code: Literal["prohibited_item", "duplicate", "scam", "poor_quality", "other"] = "other"
    reason: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def require_other_reason(self) -> "RejectListingRequest":
        if self.reason_code == "other" and not self.reason:
            raise ValueError("Unesite razlog odbijanja.")
        return self

    @property
    def resolved_reason(self) -> str:
        labels = {
            "prohibited_item": "Zabranjen predmet ili sadržaj",
            "duplicate": "Dupliran oglas",
            "scam": "Sumnja na prevaru",
            "poor_quality": "Nedovoljno kvalitetan opis ili fotografije",
            "other": "Drugo",
        }
        if self.reason_code == "other":
            return self.reason or labels[self.reason_code]
        if self.reason:
            return f"{labels[self.reason_code]}: {self.reason}"
        return labels[self.reason_code]


class FeatureListingRequest(BaseModel):
    featured_until: datetime


class SuspendUserRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=500)


class ResolveReportRequest(BaseModel):
    status: Literal["resolved", "dismissed"]
    resolution_note: str | None = None


class BrandCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    aliases: list[str] = Field(default_factory=list, max_length=20)
    category_scope: list[str] = Field(default_factory=list, max_length=20)
    is_verified: bool = True


class BrandUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    aliases: list[str] | None = Field(default=None, max_length=20)
    category_scope: list[str] | None = Field(default=None, max_length=20)
    is_verified: bool | None = None
