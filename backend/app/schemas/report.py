from pydantic import BaseModel, Field


class ReportCreate(BaseModel):
    reason: str
    description: str | None = Field(default=None, max_length=1500)


class ReportOut(BaseModel):
    id: str
    reporter_id: str
    listing_id: str | None
    reported_user_id: str | None
    reason: str
    description: str | None
    status: str

