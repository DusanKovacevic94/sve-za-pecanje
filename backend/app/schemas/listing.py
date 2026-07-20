from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, ValidationInfo, field_validator

from app.models.listing import DELIVERY_METHODS, PRICE_TYPES

CONDITIONS = {
    "new",
    "like_new",
    "used_excellent",
    "used_good",
    "used_fair",
    "for_parts_or_repair",
}
CURRENCIES = {"RSD", "EUR"}


def _validate_price_type(value: str) -> str:
    if value not in PRICE_TYPES:
        raise ValueError("Izaberite važeći tip cene.")
    return value


def _validate_delivery_methods(values: list[str]) -> list[str]:
    unique = list(dict.fromkeys(values))
    if any(value not in DELIVERY_METHODS for value in unique):
        raise ValueError("Izaberite važeći način preuzimanja ili dostave.")
    return unique


class ListingCreate(BaseModel):
    category_id: str
    title: str = Field(min_length=8, max_length=120)
    description: str = Field(min_length=20, max_length=5000)
    brand_id: str | None = None
    brand_name_custom: str | None = Field(default=None, max_length=120)
    model: str | None = Field(default=None, max_length=120)
    condition: str
    price_type: str = "fixed"
    price_amount: Decimal | None = Field(default=None, validate_default=True)
    currency: str = "RSD"
    delivery_methods: list[str] = Field(default_factory=list)
    delivery_note: str | None = Field(default=None, max_length=500)
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

    @field_validator("price_type")
    @classmethod
    def validate_price_type(cls, value: str) -> str:
        return _validate_price_type(value)

    @field_validator("price_amount")
    @classmethod
    def validate_price_amount(
        cls,
        value: Decimal | None,
        info: ValidationInfo,
    ) -> Decimal | None:
        price_type = info.data.get("price_type", "fixed")
        if price_type in {"fixed", "negotiable"} and (value is None or value <= 0):
            raise ValueError("Unesite cenu veću od nule za izabrani tip cene.")
        if price_type in {"on_request", "free"} and value is not None:
            raise ValueError("Za „Na upit” i „Poklanjam” cena se ne unosi.")
        return value

    @field_validator("delivery_methods")
    @classmethod
    def validate_delivery_methods(cls, values: list[str]) -> list[str]:
        return _validate_delivery_methods(values)


class ListingUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=8, max_length=120)
    description: str | None = Field(default=None, min_length=20, max_length=5000)
    brand_id: str | None = None
    brand_name_custom: str | None = Field(default=None, max_length=120)
    model: str | None = Field(default=None, max_length=120)
    condition: str | None = None
    price_type: str | None = None
    price_amount: Decimal | None = None
    currency: str | None = None
    delivery_methods: list[str] | None = None
    delivery_note: str | None = Field(default=None, max_length=500)
    city: str | None = Field(default=None, min_length=2, max_length=120)
    municipality: str | None = Field(default=None, max_length=120)
    allow_messages: bool | None = None
    phone_visible: bool | None = None
    attributes: dict | None = None

    @field_validator("price_type")
    @classmethod
    def validate_price_type(cls, value: str | None) -> str | None:
        return _validate_price_type(value) if value is not None else None

    @field_validator("delivery_methods")
    @classmethod
    def validate_delivery_methods(cls, values: list[str] | None) -> list[str] | None:
        return _validate_delivery_methods(values) if values is not None else None


class ListingDraftCreate(BaseModel):
    client_draft_id: str = Field(min_length=8, max_length=100)
    category_id: str
    title: str = Field(default="", max_length=120)
    description: str = Field(default="", max_length=5000)
    brand_id: str | None = None
    brand_name_custom: str | None = Field(default=None, max_length=120)
    model: str | None = Field(default=None, max_length=120)
    condition: str = ""
    price_type: str = "fixed"
    price_amount: Decimal | None = Field(default=Decimal("0"), ge=0)
    currency: str = "RSD"
    delivery_methods: list[str] = Field(default_factory=list)
    delivery_note: str | None = Field(default=None, max_length=500)
    city: str = Field(default="", max_length=120)
    municipality: str | None = Field(default=None, max_length=120)
    allow_messages: bool = True
    phone_visible: bool = False
    attributes: dict = Field(default_factory=dict)

    @field_validator("price_type")
    @classmethod
    def validate_price_type(cls, value: str) -> str:
        return _validate_price_type(value)

    @field_validator("delivery_methods")
    @classmethod
    def validate_delivery_methods(cls, values: list[str]) -> list[str]:
        return _validate_delivery_methods(values)


class ListingDraftUpdate(BaseModel):
    expected_version: int = Field(ge=0)
    category_id: str | None = None
    title: str | None = Field(default=None, max_length=120)
    description: str | None = Field(default=None, max_length=5000)
    brand_id: str | None = None
    brand_name_custom: str | None = Field(default=None, max_length=120)
    model: str | None = Field(default=None, max_length=120)
    condition: str | None = Field(default=None, max_length=40)
    price_type: str | None = None
    price_amount: Decimal | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, max_length=3)
    delivery_methods: list[str] | None = None
    delivery_note: str | None = Field(default=None, max_length=500)
    city: str | None = Field(default=None, max_length=120)
    municipality: str | None = Field(default=None, max_length=120)
    allow_messages: bool | None = None
    phone_visible: bool | None = None
    attributes: dict | None = None

    @field_validator("price_type")
    @classmethod
    def validate_price_type(cls, value: str | None) -> str | None:
        return _validate_price_type(value) if value is not None else None

    @field_validator("delivery_methods")
    @classmethod
    def validate_delivery_methods(cls, values: list[str] | None) -> list[str] | None:
        return _validate_delivery_methods(values) if values is not None else None


class ListingDraftPublish(BaseModel):
    expected_version: int = Field(ge=0)
    turnstile_token: str | None = Field(default=None, max_length=2048)


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
    price_type: str
    price_amount: Decimal | None
    currency: str
    delivery_methods: list[str]
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
    delivery_note: str | None
    attributes: dict
    attributes_display: list[AttributeDisplayOut]
    allow_messages: bool
    phone_visible: bool
    view_count: int
    favorite_count: int
    images: list[ListingImageOut]
    sold_at: datetime | None
    reserved_at: datetime | None
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
