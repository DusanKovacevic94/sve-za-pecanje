from datetime import datetime

from pydantic import BaseModel, Field


class AdminDashboard(BaseModel):
    pending_listings: int
    active_listings: int
    new_users_last_7_days: int
    unresolved_reports: int
    messages_last_7_days: int
    listings_last_7_days: int


class RejectListingRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=500)


class FeatureListingRequest(BaseModel):
    featured_until: datetime


class SuspendUserRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=500)


class ResolveReportRequest(BaseModel):
    status: str
    resolution_note: str | None = None

