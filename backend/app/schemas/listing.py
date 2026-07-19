from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator

CONDITIONS = {
    "new",
    "like_new",
    "used_excellent",
    "used_good",
    "used_fair",
    "for_parts_or_repair",
}
CURRENCIES = {"RSD", "EUR"}


class ListingCreate(BaseModel):
    category_id: str
    title: str = Field(min_length=8, max_length=120)
    description: str = Field(min_length=20, max_length=5000)
    brand_id: str | None = None
    brand_name_custom: str | None = Field(default=None, max_length=120)
    model: str | None = Field(default=None, max_length=120)
    condition: str
    price_amount: Decimal = Field(gt=0)
    currency: str = "RSD"
    city: str = Field(min_length=2, max_length=120)
    municipality: str | None = Field(default=None, max_length=120)
    allow_messages: bool = True
    phone_visible: bool = False
    attributes: dict = Field(default_factory=dict)
    turnstile_token: str | None = Field(default=None, max_length=2048)

    @field_validator("condition")
    @classmethod
    def validate_condition(cls, value: str) -> str:
        if value not in CONDITIONS:
            raise ValueError("Izaberite stanje opreme.")
        return value

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, value: str) -> str:
        if value not in CURRENCIES:
            raise ValueError("Valuta mora biti RSD ili EUR.")
        return value


class ListingUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=8, max_length=120)
    description: str | None = Field(default=None, min_length=20, max_length=5000)
    brand_id: str | None = None
    brand_name_custom: str | None = Field(default=None, max_length=120)
    model: str | None = Field(default=None, max_length=120)
    condition: str | None = None
    price_amount: Decimal | None = Field(default=None, gt=0)
    currency: str | None = None
    city: str | None = Field(default=None, min_length=2, max_length=120)
    municipality: str | None = Field(default=None, max_length=120)
    allow_messages: bool | None = None
    phone_visible: bool | None = None
    attributes: dict | None = None


class ListingImageOut(BaseModel):
    id: str
    url: str
    sort_order: int
    is_cover: bool


class ListingSellerOut(BaseModel):
    id: str
    username: str
    display_name: str | None = None
    member_since: datetime | None = None
    rating_average: float | None = None
    review_count: int | None = None
    active_listing_count: int | None = None


class ListingCategoryOut(BaseModel):
    id: str
    slug: str
    name_sr: str


class ListingBrandOut(BaseModel):
    id: str
    name: str
    slug: str


class AttributeDisplayOut(BaseModel):
    key: str
    label_sr: str
    value: str
    unit: str | None = None


class ListingCard(BaseModel):
    id: str
    public_id: str
    title: str
    slug: str
    price_amount: Decimal
    currency: str
    city: str
    condition: str
    status: str
    cover_image_url: str | None
    seller: ListingSellerOut
    category: ListingCategoryOut
    brand: ListingBrandOut | None
    key_attributes: list[AttributeDisplayOut]
    is_featured: bool
    bumped_at: datetime | None = None
    created_at: datetime


class ListingDetail(ListingCard):
    description: str
    municipality: str | None
    model: str | None
    brand_name_custom: str | None
    attributes: dict
    attributes_display: list[AttributeDisplayOut]
    allow_messages: bool
    phone_visible: bool
    view_count: int
    favorite_count: int
    images: list[ListingImageOut]
    sold_at: datetime | None
    rejection_reason: str | None
    is_favorited: bool = False


class MarkSoldRequest(BaseModel):
    sold_to_user_id: str | None = None


class ReorderImagesRequest(BaseModel):
    image_ids: list[str] = Field(min_length=1)


class FeatureRequestCreate(BaseModel):
    type: str = "featured"
    package_days: int

    @field_validator("type")
    @classmethod
    def validate_type(cls, value: str) -> str:
        if value not in {"featured", "bump", "homepage"}:
            raise ValueError("Izaberite tip promocije.")
        return value

    @field_validator("package_days")
    @classmethod
    def validate_package_days(cls, value: int) -> int:
        if value not in {0, 7, 14, 30}:
            raise ValueError("Izaberite važeći paket promocije.")
        return value
