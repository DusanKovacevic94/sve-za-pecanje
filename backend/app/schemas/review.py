from pydantic import BaseModel, Field


class ReviewCreate(BaseModel):
    listing_id: str
    reviewee_id: str
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=1500)


class ReviewOut(BaseModel):
    id: str
    listing_id: str
    reviewer_id: str
    reviewee_id: str
    rating: int
    comment: str | None
    status: str

