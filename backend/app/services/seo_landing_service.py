from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.responses import api_error
from app.models.audit import AuditLog
from app.models.brand import Brand
from app.models.category import Category
from app.models.seo_landing import SeoLandingPage
from app.models.user import User
from app.schemas.admin import SeoLandingUpsertRequest
from app.services.listing_service import ListingService

CATEGORY_MINIMUM = 3
CATEGORY_BRAND_MINIMUM = 5


@dataclass
class LandingContext:
    category: Category
    brand: Brand | None
    record: SeoLandingPage | None
    active_listing_count: int
    title: str
    meta_description: str
    intro_copy: str
    indexing_enabled: bool
    minimum_active_listings: int
    threshold_override: bool
    override_reason: str | None
    is_curated: bool

    @property
    def canonical_path(self) -> str:
        path = f"/kategorije/{self.category.slug}"
        if self.brand:
            path += f"/brend/{self.brand.slug}"
        return path

    @property
    def is_indexable(self) -> bool:
        if not self.category.is_active or self.active_listing_count <= 0:
            return False
        if self.brand and (not self.brand.is_verified or not self.is_curated):
            return False
        return bool(
            self.indexing_enabled
            and (
                self.active_listing_count >= self.minimum_active_listings
                or self.threshold_override
            )
        )


class SeoLandingService:
    def __init__(self, db: Session):
        self.db = db

    def get_public(
        self,
        category_slug: str,
        brand_slug: str | None = None,
    ) -> dict:
        category = self.db.scalar(
            select(Category).where(
                Category.slug == category_slug,
                Category.is_active.is_(True),
            )
        )
        if not category:
            raise api_error("NOT_FOUND", "Kategorija nije pronađena.", 404)
        brand = None
        if brand_slug:
            brand = self.db.scalar(
                select(Brand).where(
                    Brand.slug == brand_slug,
                    Brand.is_verified.is_(True),
                )
            )
            if not brand:
                raise api_error("NOT_FOUND", "Brend nije pronađen.", 404)
        return self.serialize(self._context(category, brand))

    def resolve(self, category_slug: str, brand_id: str | None) -> dict:
        category = self.db.scalar(
            select(Category).where(
                Category.slug == category_slug,
                Category.is_active.is_(True),
            )
        )
        if not category:
            return {"canonical_path": "/oglasi", "matched_curated_brand": False}
        if brand_id:
            brand = self.db.scalar(
                select(Brand).where(
                    Brand.id == brand_id,
                    Brand.is_verified.is_(True),
                )
            )
            record = (
                self._record(category.id, brand.id)
                if brand
                else None
            )
            if brand and record and record.indexing_enabled:
                return {
                    "canonical_path": (
                        f"/kategorije/{category.slug}/brend/{brand.slug}"
                    ),
                    "matched_curated_brand": True,
                }
        return {
            "canonical_path": f"/kategorije/{category.slug}",
            "matched_curated_brand": False,
        }

    def indexable_landings(self) -> list[dict]:
        categories = list(
            self.db.scalars(
                select(Category)
                .where(Category.is_active.is_(True))
                .order_by(Category.sort_order, Category.name_sr)
            ).all()
        )
        brand_records = list(
            self.db.scalars(
                select(SeoLandingPage)
                .options(
                    selectinload(SeoLandingPage.category),
                    selectinload(SeoLandingPage.brand),
                )
                .where(SeoLandingPage.brand_id.is_not(None))
                .order_by(SeoLandingPage.updated_at.desc())
            ).all()
        )
        contexts = [self._context(category, None) for category in categories]
        contexts.extend(
            self._context(record.category, record.brand, record=record)
            for record in brand_records
            if record.category and record.brand
        )
        return [
            {
                "path": item.canonical_path,
                "updated_at": (
                    item.record.updated_at
                    if item.record
                    else item.category.updated_at
                ),
                "active_listing_count": item.active_listing_count,
            }
            for item in contexts
            if item.is_indexable
        ]

    def list_admin(self) -> list[dict]:
        records = list(
            self.db.scalars(
                select(SeoLandingPage)
                .options(
                    selectinload(SeoLandingPage.category),
                    selectinload(SeoLandingPage.brand),
                )
                .order_by(SeoLandingPage.updated_at.desc())
            ).all()
        )
        return [
            self.serialize_admin_record(record)
            for record in records
        ]

    def serialize_admin_record(self, record: SeoLandingPage) -> dict:
        category = record.category or self.db.get(Category, record.category_id)
        brand = (
            record.brand
            if record.brand_id
            else None
        )
        if record.brand_id and not brand:
            brand = self.db.get(Brand, record.brand_id)
        return self.serialize(
            self._context(category, brand, record=record),
            admin=True,
        )

    def preview(self, payload: SeoLandingUpsertRequest) -> dict:
        category, brand = self._entities(payload.category_id, payload.brand_id)
        self._validate_payload(payload, brand)
        context = self._context(category, brand)
        context.title = payload.title.strip()
        context.meta_description = payload.meta_description.strip()
        context.intro_copy = payload.intro_copy.strip()
        context.indexing_enabled = payload.indexing_enabled
        context.minimum_active_listings = payload.minimum_active_listings
        context.threshold_override = payload.threshold_override
        context.override_reason = (payload.override_reason or "").strip() or None
        context.is_curated = True
        return self.serialize(context, admin=True)

    def create(
        self,
        payload: SeoLandingUpsertRequest,
        admin: User,
    ) -> SeoLandingPage:
        category, brand = self._entities(payload.category_id, payload.brand_id)
        self._validate_payload(payload, brand)
        item = SeoLandingPage(
            scope_key=self.scope_key(category.id, brand.id if brand else None),
            category_id=category.id,
            brand_id=brand.id if brand else None,
            updated_by_admin_id=admin.id,
            **self._values(payload),
        )
        try:
            self.db.add(item)
            self.db.flush()
        except IntegrityError as error:
            self.db.rollback()
            raise api_error(
                "SEO_LANDING_EXISTS",
                "SEO landing za ovu kategoriju i brend već postoji.",
                409,
            ) from error
        self._audit(
            admin.id,
            "seo_landing.created",
            item,
            payload.override_reason,
        )
        if payload.threshold_override:
            self._audit(
                admin.id,
                "seo_landing.threshold_override",
                item,
                payload.override_reason,
            )
        try:
            self.db.commit()
        except IntegrityError as error:
            self.db.rollback()
            raise api_error(
                "SEO_LANDING_EXISTS",
                "SEO landing za ovu kategoriju i brend već postoji.",
                409,
            ) from error
        self.db.refresh(item)
        return item

    def update(
        self,
        landing_id: str,
        payload: SeoLandingUpsertRequest,
        admin: User,
    ) -> SeoLandingPage:
        item = self.db.get(SeoLandingPage, landing_id)
        if not item:
            raise api_error("NOT_FOUND", "SEO landing nije pronađen.", 404)
        category, brand = self._entities(payload.category_id, payload.brand_id)
        self._validate_payload(payload, brand)
        previous_override = item.threshold_override
        item.scope_key = self.scope_key(category.id, brand.id if brand else None)
        item.category_id = category.id
        item.brand_id = brand.id if brand else None
        item.updated_by_admin_id = admin.id
        for key, value in self._values(payload).items():
            setattr(item, key, value)
        self._audit(
            admin.id,
            "seo_landing.updated",
            item,
            payload.override_reason,
        )
        if payload.threshold_override and not previous_override:
            self._audit(
                admin.id,
                "seo_landing.threshold_override",
                item,
                payload.override_reason,
            )
        try:
            self.db.commit()
        except IntegrityError as error:
            self.db.rollback()
            raise api_error(
                "SEO_LANDING_EXISTS",
                "SEO landing za ovu kategoriju i brend već postoji.",
                409,
            ) from error
        self.db.refresh(item)
        return item

    def serialize(self, context: LandingContext, admin: bool = False) -> dict:
        data = {
            "id": context.record.id if context.record else None,
            "category": {
                "id": context.category.id,
                "slug": context.category.slug,
                "name_sr": context.category.name_sr,
            },
            "brand": (
                {
                    "id": context.brand.id,
                    "slug": context.brand.slug,
                    "name": context.brand.name,
                }
                if context.brand
                else None
            ),
            "title": context.title,
            "meta_description": context.meta_description,
            "intro_copy": context.intro_copy,
            "canonical_path": context.canonical_path,
            "active_listing_count": context.active_listing_count,
            "minimum_active_listings": context.minimum_active_listings,
            "indexing_enabled": context.indexing_enabled,
            "is_indexable": context.is_indexable,
            "is_curated": context.is_curated,
            "updated_at": (
                context.record.updated_at
                if context.record
                else context.category.updated_at
            ),
        }
        if admin:
            data.update(
                {
                    "threshold_override": context.threshold_override,
                    "override_reason": context.override_reason,
                    "updated_by_admin_id": (
                        context.record.updated_by_admin_id
                        if context.record
                        else None
                    ),
                }
            )
        return data

    def _context(
        self,
        category: Category,
        brand: Brand | None,
        *,
        record: SeoLandingPage | None = None,
    ) -> LandingContext:
        record = record or self._record(category.id, brand.id if brand else None)
        default_minimum = (
            CATEGORY_BRAND_MINIMUM if brand else CATEGORY_MINIMUM
        )
        name = f"{brand.name} {category.name_sr}" if brand else category.name_sr
        title = (
            record.title
            if record
            else f"{name} oglasi | Sve Za Pecanje"
        )
        meta_description = (
            record.meta_description
            if record
            else (
                f"Pregledajte aktivne oglase za {name.lower()}, "
                "uporedite ponude i pronađite ribolovnu opremu."
            )
        )
        intro = (
            record.intro_copy
            if record
            else (
                category.description_sr
                or f"Aktivni oglasi za {name.lower()} na Sve Za Pecanje."
            )
        )
        params: dict[str, object] = {
            "category": category.slug,
            "page_size": 1,
        }
        if brand:
            params["brand_id"] = brand.id
        total = ListingService(self.db).count_public(params)
        return LandingContext(
            category=category,
            brand=brand,
            record=record,
            active_listing_count=total,
            title=title,
            meta_description=meta_description,
            intro_copy=intro,
            indexing_enabled=(
                record.indexing_enabled if record else brand is None
            ),
            minimum_active_listings=(
                record.minimum_active_listings if record else default_minimum
            ),
            threshold_override=record.threshold_override if record else False,
            override_reason=record.override_reason if record else None,
            is_curated=record is not None,
        )

    def _record(
        self,
        category_id: str,
        brand_id: str | None,
    ) -> SeoLandingPage | None:
        statement = select(SeoLandingPage).where(
            SeoLandingPage.scope_key == self.scope_key(category_id, brand_id)
        )
        return self.db.scalar(statement)

    def _entities(
        self,
        category_id: str,
        brand_id: str | None,
    ) -> tuple[Category, Brand | None]:
        category = self.db.get(Category, category_id)
        if not category:
            raise api_error("NOT_FOUND", "Kategorija nije pronađena.", 404)
        brand = self.db.get(Brand, brand_id) if brand_id else None
        if brand_id and not brand:
            raise api_error("NOT_FOUND", "Brend nije pronađen.", 404)
        return category, brand

    @staticmethod
    def _validate_payload(
        payload: SeoLandingUpsertRequest,
        brand: Brand | None,
    ) -> None:
        baseline = CATEGORY_BRAND_MINIMUM if brand else CATEGORY_MINIMUM
        if (
            payload.minimum_active_listings < baseline
            and not payload.threshold_override
        ):
            raise api_error(
                "SEO_OVERRIDE_REQUIRED",
                (
                    f"Minimum ispod {baseline} zahteva obrazložen "
                    "administratorski override."
                ),
                422,
            )

    @staticmethod
    def _values(payload: SeoLandingUpsertRequest) -> dict:
        return {
            "title": payload.title.strip(),
            "meta_description": payload.meta_description.strip(),
            "intro_copy": payload.intro_copy.strip(),
            "indexing_enabled": payload.indexing_enabled,
            "minimum_active_listings": payload.minimum_active_listings,
            "threshold_override": payload.threshold_override,
            "override_reason": (
                (payload.override_reason or "").strip() or None
            ),
        }

    def _audit(
        self,
        admin_id: str,
        action: str,
        item: SeoLandingPage,
        reason: str | None,
    ) -> None:
        self.db.add(
            AuditLog(
                actor_user_id=admin_id,
                action=action,
                entity_type="seo_landing",
                entity_id=item.id,
                metadata_json={
                    "category_id": item.category_id,
                    "brand_id": item.brand_id,
                    "threshold_override": item.threshold_override,
                    "reason": (reason or "").strip() or None,
                },
            )
        )

    @staticmethod
    def scope_key(category_id: str, brand_id: str | None) -> str:
        return f"{category_id}:{brand_id or 'category'}"
