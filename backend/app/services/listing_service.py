import re
from datetime import UTC, datetime, timedelta
from secrets import token_hex
from typing import Any

from pydantic import ValidationError
from sqlalchemy import Select, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.responses import api_error
from app.core.storage import delete_storage_object
from app.models.audit import AuditLog
from app.models.category import AttributeDefinition, Category
from app.models.favorite import Favorite
from app.models.image import ListingImage
from app.models.listing import Listing, PUBLIC_LISTING_STATUSES
from app.models.message import Conversation
from app.models.user import User
from app.schemas.listing import (
    ListingCreate,
    ListingDraftCreate,
    ListingDraftUpdate,
    ListingUpdate,
)
from app.models.profile import UserProfile
from app.services.attribute_service import validate_and_coerce_attributes
from app.services.analytics_service import AnalyticsService
from app.services.category_service import effective_loaded_attribute_definitions
from app.services.filter_service import apply_listing_filters

DRAFT_RETENTION_DAYS = 90
DRAFT_WARNING_DAYS = 7


def slugify(value: str) -> str:
    replacements = {"š": "s", "đ": "dj", "č": "c", "ć": "c", "ž": "z"}
    normalized = value.lower()
    for source, target in replacements.items():
        normalized = normalized.replace(source, target)
    normalized = re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")
    return normalized or "oglas"


class ListingService:
    def __init__(self, db: Session):
        self.db = db

    def create(self, seller: User, payload: ListingCreate) -> Listing:
        self._ensure_seller_can_publish(seller)
        attributes = validate_and_coerce_attributes(self.db, payload.category_id, payload.attributes)
        public_id = token_hex(4)
        now = datetime.now(UTC)
        automatically_approved = settings.listing_review_mode == "auto"
        listing = Listing(
            public_id=public_id,
            seller_id=seller.id,
            category_id=payload.category_id,
            brand_id=payload.brand_id,
            brand_name_custom=payload.brand_name_custom,
            model=payload.model,
            title=payload.title,
            slug=f"{slugify(payload.title)}-{public_id}",
            description=payload.description,
            condition=payload.condition,
            price_type=payload.price_type,
            price_amount=payload.price_amount,
            currency=payload.currency,
            delivery_methods=payload.delivery_methods,
            delivery_note=payload.delivery_note,
            city=payload.city,
            municipality=payload.municipality,
            status="active" if automatically_approved else "pending_review",
            approved_at=now if automatically_approved else None,
            expires_at=now + timedelta(days=settings.listing_lifetime_days),
            attributes=attributes,
            allow_messages=payload.allow_messages,
            phone_visible=payload.phone_visible,
        )
        self.db.add(listing)
        self.db.flush()
        self.track(
            seller.id,
            "listing_published",
            "listing",
            listing.id,
            category_id=listing.category_id,
            properties={"status": listing.status},
        )
        if automatically_approved:
            self.track(
                seller.id,
                "listing_approved",
                "listing",
                listing.id,
                category_id=listing.category_id,
                properties={"review_mode": "auto"},
            )
        self.db.commit()
        self.db.refresh(listing)
        from app.services.risk_service import RiskService

        RiskService(self.db).fingerprint_listing(listing)
        return listing

    def create_draft(self, seller: User, payload: ListingDraftCreate) -> Listing:
        self._ensure_seller_can_publish(seller)
        existing = self.db.scalar(
            self._base_query().where(
                Listing.seller_id == seller.id,
                Listing.draft_client_id == payload.client_draft_id,
            )
        )
        if existing:
            if existing.status != "draft":
                raise api_error(
                    "DRAFT_ALREADY_PUBLISHED",
                    "Ova verzija nacrta je već objavljena.",
                    409,
                    {"listing_id": existing.id},
                )
            return existing
        if not self.db.get(Category, payload.category_id):
            raise api_error("VALIDATION_ERROR", "Izaberite važeću kategoriju.", 422)
        now = datetime.now(UTC)
        public_id = token_hex(4)
        listing = Listing(
            public_id=public_id,
            seller_id=seller.id,
            category_id=payload.category_id,
            brand_id=payload.brand_id,
            brand_name_custom=payload.brand_name_custom,
            model=payload.model,
            title=payload.title,
            slug=f"nacrt-{public_id}",
            description=payload.description,
            condition=payload.condition,
            price_type=payload.price_type,
            price_amount=payload.price_amount,
            currency=payload.currency,
            delivery_methods=payload.delivery_methods,
            delivery_note=payload.delivery_note,
            city=payload.city,
            municipality=payload.municipality,
            status="draft",
            attributes=payload.attributes,
            allow_messages=payload.allow_messages,
            phone_visible=payload.phone_visible,
            draft_client_id=payload.client_draft_id,
            draft_version=1,
            draft_last_saved_at=now,
            expires_at=None,
        )
        self.db.add(listing)
        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            existing = self.db.scalar(
                self._base_query().where(
                    Listing.seller_id == seller.id,
                    Listing.draft_client_id == payload.client_draft_id,
                )
            )
            if existing and existing.status == "draft":
                return existing
            raise
        return self.get_owned_or_admin(listing.id, seller)

    def update_draft(
        self,
        listing: Listing,
        payload: ListingDraftUpdate,
        actor: User,
    ) -> Listing:
        listing = self._lock_listing(listing.id)
        self._ensure_draft_owner(listing, actor)
        if listing.draft_version != payload.expected_version:
            raise api_error(
                "AUTOSAVE_CONFLICT",
                "Nacrt je izmenjen u drugoj sesiji.",
                409,
                {
                    "server_version": listing.draft_version,
                    "server_updated_at": (
                        listing.draft_last_saved_at.isoformat()
                        if listing.draft_last_saved_at
                        else None
                    ),
                },
            )
        data = payload.model_dump(exclude_unset=True, exclude={"expected_version"})
        category_id = data.get("category_id")
        if "category_id" in data and not category_id:
            raise api_error("VALIDATION_ERROR", "Izaberite važeću kategoriju.", 422)
        if category_id and not self.db.get(Category, category_id):
            raise api_error("VALIDATION_ERROR", "Izaberite važeću kategoriju.", 422)
        draft_defaults: dict[str, Any] = {
            "title": "",
            "description": "",
            "condition": "",
            "price_type": "fixed",
            "currency": "RSD",
            "delivery_methods": [],
            "city": "",
            "attributes": {},
            "allow_messages": True,
            "phone_visible": False,
        }
        for key, default in draft_defaults.items():
            if key in data and data[key] is None:
                data[key] = default
        if data.get("price_type") in {"on_request", "free"}:
            data["price_amount"] = None
        for key, value in data.items():
            setattr(listing, key, value)
        listing.draft_version += 1
        listing.draft_last_saved_at = datetime.now(UTC)
        self.db.commit()
        return self.get_owned_or_admin(listing.id, actor)

    def publish_draft(self, listing: Listing, actor: User, expected_version: int) -> Listing:
        listing = self._lock_listing(listing.id)
        self._ensure_draft_owner(listing, actor)
        if listing.draft_version != expected_version:
            raise api_error(
                "AUTOSAVE_CONFLICT",
                "Nacrt je izmenjen u drugoj sesiji. Osvežite stranicu pre objave.",
                409,
                {"server_version": listing.draft_version},
            )
        try:
            payload = ListingCreate.model_validate(
                {
                    "category_id": listing.category_id,
                    "title": listing.title,
                    "description": listing.description,
                    "brand_id": listing.brand_id,
                    "brand_name_custom": listing.brand_name_custom,
                    "model": listing.model,
                    "condition": listing.condition,
                    "price_type": listing.price_type,
                    "price_amount": listing.price_amount,
                    "currency": listing.currency,
                    "delivery_methods": listing.delivery_methods,
                    "delivery_note": listing.delivery_note,
                    "city": listing.city,
                    "municipality": listing.municipality,
                    "allow_messages": listing.allow_messages,
                    "phone_visible": listing.phone_visible,
                    "attributes": listing.attributes,
                }
            )
        except ValidationError as error:
            fields = sorted(
                {
                    str(item["loc"][0])
                    for item in error.errors()
                    if item.get("loc")
                }
            )
            raise api_error(
                "VALIDATION_ERROR",
                "Dovršite obavezna polja pre slanja oglasa.",
                422,
                {"fields": fields},
            ) from error
        attributes = validate_and_coerce_attributes(
            self.db,
            payload.category_id,
            payload.attributes,
        )
        now = datetime.now(UTC)
        automatically_approved = settings.listing_review_mode == "auto"
        listing.attributes = attributes
        listing.slug = f"{slugify(payload.title)}-{listing.public_id}"
        listing.status = "active" if automatically_approved else "pending_review"
        listing.approved_at = now if automatically_approved else None
        listing.expires_at = now + timedelta(days=settings.listing_lifetime_days)
        listing.draft_last_saved_at = None
        listing.draft_version += 1
        self.track(
            actor.id,
            "listing_published",
            "listing",
            listing.id,
            category_id=listing.category_id,
            properties={"status": listing.status, "from_draft": True},
        )
        if automatically_approved:
            self.track(
                actor.id,
                "listing_approved",
                "listing",
                listing.id,
                category_id=listing.category_id,
                properties={"review_mode": "auto", "from_draft": True},
            )
        self.db.commit()
        published = self.get_owned_or_admin(listing.id, actor)
        from app.services.risk_service import RiskService

        RiskService(self.db).fingerprint_listing(published)
        return published

    def delete_draft(self, listing: Listing, actor: User) -> None:
        self._ensure_draft_owner(listing, actor)
        storage_keys = [image.storage_key for image in listing.images]
        self.db.delete(listing)
        self.db.commit()
        for storage_key in storage_keys:
            delete_storage_object(storage_key)

    def update(self, listing: Listing, payload: ListingUpdate, actor: User) -> Listing:
        if listing.seller_id != actor.id and actor.role not in {"admin", "super_admin"}:
            raise api_error("FORBIDDEN", "Nemate dozvolu za izmenu ovog oglasa.", 403)
        if listing.status == "draft":
            raise api_error(
                "VALIDATION_ERROR",
                "Nacrt se čuva preko autosave operacije.",
                400,
            )
        data = payload.model_dump(exclude_unset=True)
        next_price_type = data.get("price_type", listing.price_type)
        if next_price_type in {"on_request", "free"}:
            if data.get("price_amount") is not None:
                raise api_error(
                    "VALIDATION_ERROR",
                    "Za „Na upit” i „Poklanjam” cena se ne unosi.",
                    422,
                    {"field": "price_amount"},
                )
            data["price_amount"] = None
        else:
            next_amount = data.get("price_amount", listing.price_amount)
            if next_amount is None or next_amount <= 0:
                raise api_error(
                    "VALIDATION_ERROR",
                    "Unesite cenu veću od nule za izabrani tip cene.",
                    422,
                    {"field": "price_amount"},
                )
        if "attributes" in data and data["attributes"] is not None:
            data["attributes"] = validate_and_coerce_attributes(
                self.db,
                listing.category_id,
                data["attributes"],
                enforce_required=False,
            )
        major_fields = {
            "title",
            "description",
            "category_id",
            "price_type",
            "price_amount",
            "delivery_methods",
            "delivery_note",
            "attributes",
        }
        for key, value in data.items():
            setattr(listing, key, value)
        if (
            actor.role == "user"
            and listing.status in PUBLIC_LISTING_STATUSES
            and major_fields.intersection(data)
        ):
            listing.status = "pending_review"
            listing.reserved_at = None
            listing.reserved_by_user_id = None
        self.db.commit()
        self.db.refresh(listing)
        from app.services.risk_service import RiskService

        RiskService(self.db).fingerprint_listing(listing)
        return listing

    def list_public(self, params: dict[str, Any]) -> tuple[list[Listing], int]:
        page = max(int(params.get("page", 1)), 1)
        page_size = min(max(int(params.get("page_size", 24)), 1), 48)
        query = self._base_query().where(Listing.status.in_(PUBLIC_LISTING_STATUSES))
        query, rank = apply_listing_filters(self.db, query, params)
        total = self.db.scalar(select(func.count()).select_from(query.subquery())) or 0
        query = self._apply_sort(query, params.get("sort"), rank)
        rows = self.db.scalars(query.offset((page - 1) * page_size).limit(page_size)).all()
        return list(rows), total

    def get_by_slug(self, slug: str) -> Listing:
        listing = self.db.scalar(
            self._base_query().where(
                Listing.slug == slug,
                Listing.status.not_in({"draft", "deleted"}),
            )
        )
        if not listing:
            raise api_error("NOT_FOUND", "Oglas nije pronađen.", 404)
        return listing

    def get_owned_or_admin(self, listing_id: str, actor: User) -> Listing:
        listing = self.db.scalar(self._base_query().where(Listing.id == listing_id))
        if not listing:
            raise api_error("NOT_FOUND", "Oglas nije pronađen.", 404)
        if listing.seller_id != actor.id and actor.role not in {"admin", "super_admin"}:
            raise api_error("FORBIDDEN", "Nemate dozvolu za ovaj oglas.", 403)
        return listing

    def favorite(self, listing_id: str, user: User) -> None:
        listing = self.db.get(Listing, listing_id)
        if not listing or listing.status not in PUBLIC_LISTING_STATUSES:
            raise api_error("NOT_FOUND", "Oglas nije pronađen.", 404)
        exists = self.db.scalar(
            select(Favorite).where(Favorite.user_id == user.id, Favorite.listing_id == listing_id)
        )
        if not exists:
            self.db.add(Favorite(user_id=user.id, listing_id=listing_id))
            listing.favorite_count += 1
            self.track(
                user.id,
                "favorite_added",
                "listing",
                listing_id,
                category_id=listing.category_id,
            )
            self.db.commit()

    def unfavorite(self, listing_id: str, user: User) -> None:
        favorite = self.db.scalar(
            select(Favorite).where(Favorite.user_id == user.id, Favorite.listing_id == listing_id)
        )
        if favorite:
            listing = self.db.get(Listing, listing_id)
            self.db.delete(favorite)
            if listing and listing.favorite_count > 0:
                listing.favorite_count -= 1
            self.db.commit()

    def mark_sold(self, listing: Listing, actor: User, sold_to_user_id: str | None = None) -> Listing:
        if listing.seller_id != actor.id and actor.role not in {"admin", "super_admin"}:
            raise api_error("FORBIDDEN", "Samo prodavac ili admin može označiti oglas kao prodat.", 403)
        if listing.status not in PUBLIC_LISTING_STATUSES:
            raise api_error(
                "INVALID_LISTING_STATE",
                "Samo aktivan ili rezervisan oglas može biti označen kao prodat.",
                409,
            )
        if sold_to_user_id:
            buyer_conversation = self.db.scalar(
                select(Conversation.id).where(
                    Conversation.listing_id == listing.id,
                    Conversation.seller_id == listing.seller_id,
                    Conversation.buyer_id == sold_to_user_id,
                )
            )
            if not buyer_conversation:
                raise api_error("VALIDATION_ERROR", "Izaberite kupca iz razgovora za ovaj oglas.", 400)
        listing.status = "sold"
        listing.sold_at = datetime.now(UTC)
        listing.sold_to_user_id = sold_to_user_id
        listing.reserved_at = None
        listing.reserved_by_user_id = None
        self._audit_state_change(actor, listing, "listing.sold", "sold")
        self.track(
            actor.id,
            "listing_marked_sold",
            "listing",
            listing.id,
            category_id=listing.category_id,
        )
        self.db.commit()
        self.db.refresh(listing)
        return listing

    def reserve(self, listing: Listing, actor: User) -> Listing:
        self._ensure_owner_or_admin(listing, actor)
        if listing.status != "active":
            raise api_error(
                "INVALID_LISTING_STATE",
                "Samo aktivan oglas može biti rezervisan.",
                409,
            )
        listing.status = "reserved"
        listing.reserved_at = datetime.now(UTC)
        listing.reserved_by_user_id = actor.id
        self._audit_state_change(actor, listing, "listing.reserved", "reserved")
        self.db.commit()
        self.db.refresh(listing)
        return listing

    def unreserve(self, listing: Listing, actor: User) -> Listing:
        self._ensure_owner_or_admin(listing, actor)
        if listing.status != "reserved":
            raise api_error(
                "INVALID_LISTING_STATE",
                "Samo rezervisan oglas može ponovo biti aktiviran.",
                409,
            )
        listing.status = "active"
        listing.reserved_at = None
        listing.reserved_by_user_id = None
        self._audit_state_change(actor, listing, "listing.unreserved", "active")
        self.db.commit()
        self.db.refresh(listing)
        return listing

    def archive(self, listing: Listing) -> Listing:
        if listing.status == "draft":
            raise api_error("VALIDATION_ERROR", "Nacrt obrišite iz liste nacrta.", 400)
        listing.status = "archived"
        listing.reserved_at = None
        listing.reserved_by_user_id = None
        self.db.commit()
        self.db.refresh(listing)
        return listing

    def add_image(self, listing: Listing, image_data: dict[str, Any]) -> ListingImage:
        if len(listing.images) >= settings.max_listing_images:
            raise api_error("IMAGE_LIMIT_EXCEEDED", "Oglas može imati najviše 10 slika.", 400)
        sort_order = len(listing.images)
        image = ListingImage(
            listing_id=listing.id,
            sort_order=sort_order,
            is_cover=sort_order == 0,
            **image_data,
        )
        self.db.add(image)
        if listing.status in PUBLIC_LISTING_STATUSES:
            listing.status = "pending_review"
            listing.reserved_at = None
            listing.reserved_by_user_id = None
        elif listing.status == "draft":
            listing.draft_last_saved_at = datetime.now(UTC)
        self.db.commit()
        self.db.refresh(image)
        if listing.status != "draft":
            from app.services.risk_service import RiskService

            RiskService(self.db).fingerprint_listing(listing)
        return image

    def delete_image(self, listing: Listing, image_id: str) -> None:
        image = self._get_listing_image(listing, image_id)
        was_cover = image.is_cover
        storage_key = image.storage_key
        self.db.delete(image)
        self.db.flush()
        remaining = list(self.db.scalars(select(ListingImage).where(ListingImage.listing_id == listing.id)).all())
        for index, item in enumerate(sorted(remaining, key=lambda row: row.sort_order)):
            item.sort_order = index
            item.is_cover = item.is_cover or (was_cover and index == 0)
        if listing.status == "draft":
            listing.draft_last_saved_at = datetime.now(UTC)
        self.db.commit()
        delete_storage_object(storage_key)
        if listing.status != "draft":
            from app.services.risk_service import RiskService

            RiskService(self.db).fingerprint_listing(listing)

    def set_cover_image(self, listing: Listing, image_id: str) -> ListingImage:
        image = self._get_listing_image(listing, image_id)
        for item in listing.images:
            item.is_cover = item.id == image.id
        if listing.status == "draft":
            listing.draft_last_saved_at = datetime.now(UTC)
        self.db.commit()
        self.db.refresh(image)
        return image

    def reorder_images(self, listing: Listing, image_ids: list[str]) -> list[ListingImage]:
        current = {image.id: image for image in listing.images}
        if set(image_ids) != set(current):
            raise api_error("VALIDATION_ERROR", "Redosled mora sadržati sve slike oglasa.", 400)
        for index, image_id in enumerate(image_ids):
            current[image_id].sort_order = index
        if listing.status == "draft":
            listing.draft_last_saved_at = datetime.now(UTC)
        self.db.commit()
        return sorted(current.values(), key=lambda image: image.sort_order)

    def _get_listing_image(self, listing: Listing, image_id: str) -> ListingImage:
        image = self.db.get(ListingImage, image_id)
        if not image or image.listing_id != listing.id:
            raise api_error("NOT_FOUND", "Slika nije pronađena.", 404)
        return image

    def _ensure_seller_can_publish(self, seller: User) -> None:
        if not seller.email_verified_at:
            raise api_error(
                "FORBIDDEN",
                "Potvrdite email adresu pre postavljanja oglasa.",
                403,
            )

    def _ensure_draft_owner(self, listing: Listing, actor: User) -> None:
        if listing.seller_id != actor.id and actor.role not in {"admin", "super_admin"}:
            raise api_error("FORBIDDEN", "Nemate dozvolu za ovaj nacrt.", 403)
        if listing.status != "draft":
            raise api_error("DRAFT_NOT_EDITABLE", "Ovaj nacrt više nije dostupan.", 409)

    def _ensure_owner_or_admin(self, listing: Listing, actor: User) -> None:
        if listing.seller_id != actor.id and actor.role not in {"admin", "super_admin"}:
            raise api_error("FORBIDDEN", "Nemate dozvolu za ovu izmenu oglasa.", 403)

    def _audit_state_change(
        self,
        actor: User,
        listing: Listing,
        action: str,
        status: str,
    ) -> None:
        self.db.add(
            AuditLog(
                actor_user_id=actor.id,
                action=action,
                entity_type="listing",
                entity_id=listing.id,
                metadata_json={"status": status},
            )
        )

    def _lock_listing(self, listing_id: str) -> Listing:
        listing = self.db.scalar(
            self._base_query()
            .where(Listing.id == listing_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        if not listing:
            raise api_error("NOT_FOUND", "Oglas nije pronađen.", 404)
        return listing

    def _base_query(self) -> Select[tuple[Listing]]:
        return select(Listing).options(
            selectinload(Listing.seller).selectinload(User.profile),
            selectinload(Listing.category).selectinload(Category.attributes),
            selectinload(Listing.category)
            .selectinload(Category.parent)
            .selectinload(Category.attributes),
            selectinload(Listing.brand),
            selectinload(Listing.images),
        )

    def _apply_sort(
        self, query: Select[tuple[Listing]], sort: str | None, rank=None
    ) -> Select[tuple[Listing]]:
        featured = Listing.is_featured.desc()
        freshness = func.coalesce(Listing.bumped_at, Listing.created_at).desc()
        if sort == "price_asc":
            return query.order_by(featured, Listing.price_amount.asc().nullslast())
        if sort == "price_desc":
            return query.order_by(featured, Listing.price_amount.desc().nullslast())
        if sort == "most_viewed":
            return query.order_by(featured, Listing.view_count.desc())
        if rank is not None and not sort:
            return query.order_by(featured, rank.desc(), freshness)
        return query.order_by(featured, freshness)

    def track(
        self,
        user_id: str | None,
        event_name: str,
        entity_type: str,
        entity_id: str,
        properties: dict | None = None,
        category_id: str | None = None,
    ) -> None:
        AnalyticsService(self.db).track(
            event_name,
            user_id,
            properties,
            entity_type=entity_type,
            entity_id=entity_id,
            category_id=category_id,
        )


def _attribute_option_label(definition: AttributeDefinition, value: Any) -> str | None:
    options = definition.options.get("options", []) if isinstance(definition.options, dict) else []
    for option in options:
        if str(option.get("value")) == str(value):
            return option.get("label_sr") or option.get("label") or str(value)
    return str(value) if value not in (None, "") else None


def _format_attribute_value(definition: AttributeDefinition, value: Any) -> str | None:
    if value in (None, ""):
        return None
    if definition.field_type == "boolean":
        return "Da" if bool(value) else "Ne"
    if definition.field_type == "enum":
        return _attribute_option_label(definition, value)
    if definition.field_type == "multiselect" and isinstance(value, list):
        labels = [_attribute_option_label(definition, item) for item in value]
        return ", ".join(label for label in labels if label)
    if isinstance(value, list):
        return ", ".join(str(item) for item in value if item not in (None, ""))
    return str(value)


def _display_attributes(listing: Listing) -> list[dict[str, str | None]]:
    if not listing.attributes:
        return []
    definitions = effective_loaded_attribute_definitions(listing.category)
    values: list[dict[str, str | None]] = []
    for definition in definitions:
        value = listing.attributes.get(definition.key)
        display_value = _format_attribute_value(definition, value)
        if not display_value:
            continue
        values.append(
            {
                "key": definition.key,
                "label_sr": definition.label_sr,
                "value": display_value,
                "unit": definition.unit,
            }
        )
    return values


def _is_shop_active(profile: UserProfile | None) -> bool:
    if not profile or not profile.shop_name or not profile.shop_slug or not profile.shop_active_until:
        return False
    active_until = profile.shop_active_until.replace(tzinfo=UTC) if profile.shop_active_until.tzinfo is None else profile.shop_active_until.astimezone(UTC)
    return active_until > datetime.now(UTC)


def serialize_listing_card(listing: Listing) -> dict:
    cover = next((image for image in listing.images if image.is_cover), listing.images[0] if listing.images else None)
    seller_profile = listing.seller.profile if listing.seller else None
    seller_shop_active = _is_shop_active(seller_profile)
    display_attributes = _display_attributes(listing)
    draft_saved_at = listing.draft_last_saved_at or listing.updated_at
    draft_expires_at = (
        draft_saved_at + timedelta(days=DRAFT_RETENTION_DAYS)
        if listing.status == "draft" and draft_saved_at
        else None
    )
    draft_expires_soon = bool(
        draft_expires_at
        and _as_utc(draft_expires_at)
        <= datetime.now(UTC) + timedelta(days=DRAFT_WARNING_DAYS)
    )
    return {
        "id": listing.id,
        "public_id": listing.public_id,
        "title": listing.title,
        "slug": listing.slug,
        "price_type": listing.price_type,
        "price_amount": listing.price_amount,
        "currency": listing.currency,
        "delivery_methods": listing.delivery_methods,
        "city": listing.city,
        "condition": listing.condition,
        "status": listing.status,
        "cover_image_url": cover.url if cover else None,
        "seller": {
            "id": listing.seller.id,
            "username": listing.seller.username,
            "display_name": seller_profile.display_name if seller_profile else None,
            "shop_name": seller_profile.shop_name if seller_profile and seller_shop_active else None,
            "shop_slug": seller_profile.shop_slug if seller_profile and seller_shop_active else None,
            "shop_logo_url": seller_profile.shop_logo_url if seller_profile and seller_shop_active else None,
            "shop_active": seller_shop_active,
        },
        "category": {
            "id": listing.category.id,
            "slug": listing.category.slug,
            "name_sr": listing.category.name_sr,
        },
        "brand": (
            {"id": listing.brand.id, "name": listing.brand.name, "slug": listing.brand.slug}
            if listing.brand
            else None
        ),
        "key_attributes": display_attributes[:4],
        "is_featured": listing.is_featured,
        "featured_until": listing.featured_until,
        "bumped_at": listing.bumped_at,
        "view_count": listing.view_count,
        "favorite_count": listing.favorite_count,
        "created_at": listing.created_at,
        "updated_at": listing.updated_at,
        "reserved_at": listing.reserved_at,
        "draft_version": listing.draft_version,
        "draft_expires_at": draft_expires_at,
        "draft_expires_soon": draft_expires_soon,
    }


def serialize_listing_detail(
    listing: Listing,
    is_favorited: bool = False,
    seller_stats: dict[str, int | float | None] | None = None,
) -> dict:
    data = serialize_listing_card(listing)
    if seller_stats:
        data["seller"].update(seller_stats)
    display_attributes = _display_attributes(listing)
    data.update(
        {
            "description": listing.description,
            "municipality": listing.municipality,
            "model": listing.model,
            "brand_name_custom": listing.brand_name_custom,
            "delivery_note": listing.delivery_note,
            "attributes": listing.attributes,
            "attributes_display": display_attributes,
            "allow_messages": listing.allow_messages,
            "phone_visible": listing.phone_visible,
            "view_count": listing.view_count,
            "favorite_count": listing.favorite_count,
            "images": [
                {
                    "id": image.id,
                    "url": image.url,
                    "sort_order": image.sort_order,
                    "is_cover": image.is_cover,
                }
                for image in listing.images
            ],
            "sold_at": listing.sold_at,
            "rejection_reason": listing.rejection_reason,
            "is_favorited": is_favorited,
        }
    )
    return data


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)
