from pydantic import BaseModel, field_validator


class ShopProfileUpdate(BaseModel):
    shop_name: str | None = None
    shop_logo_url: str | None = None
    shop_description: str | None = None
    shop_tax_id: str | None = None
    shop_registration_number: str | None = None

    @field_validator("shop_name")
    @classmethod
    def validate_shop_name(cls, value: str | None) -> str | None:
        if value is None:
            return value
        stripped = value.strip()
        if len(stripped) < 2:
            raise ValueError("Naziv prodavnice je obavezan.")
        if len(stripped) > 160:
            raise ValueError("Naziv prodavnice je predugačak.")
        return stripped


class ShopSubscriptionCreate(BaseModel):
    plan: str = "monthly"

    @field_validator("plan")
    @classmethod
    def validate_plan(cls, value: str) -> str:
        if value not in {"monthly", "yearly"}:
            raise ValueError("Nepoznat paket prodavnice.")
        return value
