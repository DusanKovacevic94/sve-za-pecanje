import re
from datetime import UTC, datetime
from decimal import Decimal
from secrets import token_hex
from typing import Any

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.responses import api_error
from app.models.analytics import AnalyticsEvent
from app.models.brand import Brand
from app.models.category import AttributeDefinition, Category
from app.models.favorite import Favorite
from app.models.image import ListingImage
from app.models.listing import Listing
from app.models.user import User
from app.schemas.listing import ListingCreate, ListingUpdate


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
        if not seller.email_verified_at:
            raise api_error("FORBIDDEN", "Potvrdite email adresu pre postavljanja oglasa.", 403)
        self._validate_attributes(payload.category_id, payload.attributes)
        public_id = token_hex(4)
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
            price_amount=payload.price_amount,
            currency=payload.currency,
            city=payload.city,
            municipality=payload.municipality,
            status="active" if settings.listing_review_mode == "auto" else "pending_review",
            attributes=payload.attributes,
            allow_messages=payload.allow_messages,
            phone_visible=payload.phone_visible,
        )
        self.db.add(listing)
        self.db.flush()
        self.track(seller.id, "listing_created", "listing", listing.id)
        self.db.commit()
        self.db.refresh(listing)
        return listing

    def update(self, listing: Listing, payload: ListingUpdate, actor: User) -> Listing:
        if listing.seller_id != actor.id and actor.role not in {"admin", "super_admin"}:
            raise api_error("FORBIDDEN", "Nemate dozvolu za izmenu ovog oglasa.", 403)
        data = payload.model_dump(exclude_unset=True)
        if "attributes" in data and data["attributes"] is not None:
            self._validate_attributes(listing.category_id, data["attributes"])
        major_fields = {"title", "description", "category_id", "price_amount", "attributes"}
        for key, value in data.items():
            setattr(listing, key, value)
        if actor.role == "user" and listing.status == "active" and major_fields.intersection(data):
            listing.status = "pending_review"
        self.db.commit()
        self.db.refresh(listing)
        return listing

    def list_public(self, params: dict[str, Any]) -> tuple[list[Listing], int]:
        page = max(int(params.get("page", 1)), 1)
        page_size = min(max(int(params.get("page_size", 24)), 1), 48)
        query = self._base_query().where(Listing.status == params.get("status", "active"))
        query = self._apply_filters(query, params)
        total = self.db.scalar(select(func.count()).select_from(query.subquery())) or 0
        query = self._apply_sort(query, params.get("sort"))
        rows = self.db.scalars(query.offset((page - 1) * page_size).limit(page_size)).all()
        return list(rows), total

    def get_by_slug(self, slug: str, increment_view: bool = True) -> Listing:
        listing = self.db.scalar(self._base_query().where(Listing.slug == slug))
        if not listing:
            raise api_error("NOT_FOUND", "Oglas nije pronađen.", 404)
        if increment_view:
            listing.view_count += 1
            self.track(None, "listing_viewed", "listing", listing.id)
            self.db.commit()
        return listing

    def get_owned_or_admin(self, listing_id: str, actor: User) -> Listing:
        listing = self.db.get(Listing, listing_id)
        if not listing:
            raise api_error("NOT_FOUND", "Oglas nije pronađen.", 404)
        if listing.seller_id != actor.id and actor.role not in {"admin", "super_admin"}:
            raise api_error("FORBIDDEN", "Nemate dozvolu za ovaj oglas.", 403)
        return listing

    def favorite(self, listing_id: str, user: User) -> None:
        listing = self.db.get(Listing, listing_id)
        if not listing:
            raise api_error("NOT_FOUND", "Oglas nije pronađen.", 404)
        exists = self.db.scalar(
            select(Favorite).where(Favorite.user_id == user.id, Favorite.listing_id == listing_id)
        )
        if not exists:
            self.db.add(Favorite(user_id=user.id, listing_id=listing_id))
            listing.favorite_count += 1
            self.track(user.id, "favorite_added", "listing", listing_id)
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
        listing.status = "sold"
        listing.sold_at = datetime.now(UTC)
        listing.sold_to_user_id = sold_to_user_id
        self.track(actor.id, "listing_marked_sold", "listing", listing.id)
        self.db.commit()
        self.db.refresh(listing)
        return listing

    def archive(self, listing: Listing) -> Listing:
        listing.status = "archived"
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
        if listing.status == "active":
            listing.status = "pending_review"
        self.db.commit()
        self.db.refresh(image)
        return image

    def _base_query(self) -> Select[tuple[Listing]]:
        return select(Listing).options(
            selectinload(Listing.seller).selectinload(User.profile),
            selectinload(Listing.category),
            selectinload(Listing.brand),
            selectinload(Listing.images),
        )

    def _apply_filters(self, query: Select[tuple[Listing]], params: dict[str, Any]) -> Select[tuple[Listing]]:
        q = params.get("q")
        if q:
            pattern = f"%{q}%"
            query = query.outerjoin(Brand).where(
                or_(
                    Listing.title.ilike(pattern),
                    Listing.description.ilike(pattern),
                    Listing.model.ilike(pattern),
                    Listing.city.ilike(pattern),
                    Listing.brand_name_custom.ilike(pattern),
                    Brand.name.ilike(pattern),
                )
            )
            self.track(None, "search_performed", "search", "public", {"q": q})
        if params.get("category"):
            query = query.join(Category, Listing.category_id == Category.id).where(
                Category.slug == params["category"]
            )
        for key in ["condition", "currency", "city", "brand_id"]:
            if params.get(key):
                query = query.where(getattr(Listing, key) == params[key])
        if params.get("price_min"):
            query = query.where(Listing.price_amount >= Decimal(str(params["price_min"])))
        if params.get("price_max"):
            query = query.where(Listing.price_amount <= Decimal(str(params["price_max"])))
        if params.get("with_images") in {"true", True}:
            query = query.where(Listing.images.any())
        for key, value in params.items():
            if key.startswith("attributes[") and key.endswith("]") and value:
                attr_key = key.removeprefix("attributes[").removesuffix("]")
                query = query.where(Listing.attributes[attr_key].as_string() == str(value))
        return query

    def _apply_sort(self, query: Select[tuple[Listing]], sort: str | None) -> Select[tuple[Listing]]:
        featured = Listing.is_featured.desc()
        if sort == "price_asc":
            return query.order_by(featured, Listing.price_amount.asc())
        if sort == "price_desc":
            return query.order_by(featured, Listing.price_amount.desc())
        if sort == "most_viewed":
            return query.order_by(featured, Listing.view_count.desc())
        return query.order_by(featured, Listing.created_at.desc())

    def _validate_attributes(self, category_id: str, attributes: dict[str, Any]) -> None:
        definitions = self.db.scalars(
            select(AttributeDefinition).where(AttributeDefinition.category_id == category_id)
        ).all()
        missing = [definition.label_sr for definition in definitions if definition.required and not attributes.get(definition.key)]
        if missing:
            raise api_error(
                "VALIDATION_ERROR",
                "Nedostaju obavezna polja.",
                422,
                {"missing": missing},
            )

    def track(
        self,
        user_id: str | None,
        event_name: str,
        entity_type: str,
        entity_id: str,
        properties: dict | None = None,
    ) -> None:
        self.db.add(
            AnalyticsEvent(
                user_id=user_id,
                event_name=event_name,
                entity_type=entity_type,
                entity_id=entity_id,
                properties=properties or {},
            )
        )


def serialize_listing_card(listing: Listing) -> dict:
    cover = next((image for image in listing.images if image.is_cover), listing.images[0] if listing.images else None)
    seller_profile = listing.seller.profile if listing.seller else None
    key_attributes = dict(list(listing.attributes.items())[:4]) if listing.attributes else {}
    return {
        "id": listing.id,
        "public_id": listing.public_id,
        "title": listing.title,
        "slug": listing.slug,
        "price_amount": listing.price_amount,
        "currency": listing.currency,
        "city": listing.city,
        "condition": listing.condition,
        "status": listing.status,
        "cover_image_url": cover.url if cover else None,
        "seller": {
            "id": listing.seller.id,
            "username": listing.seller.username,
            "display_name": seller_profile.display_name if seller_profile else None,
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
        "key_attributes": key_attributes,
        "is_featured": listing.is_featured,
        "created_at": listing.created_at,
    }


def serialize_listing_detail(listing: Listing) -> dict:
    data = serialize_listing_card(listing)
    data.update(
        {
            "description": listing.description,
            "municipality": listing.municipality,
            "model": listing.model,
            "brand_name_custom": listing.brand_name_custom,
            "attributes": listing.attributes,
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
        }
    )
    return data
