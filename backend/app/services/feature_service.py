from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy import Select, select
from sqlalchemy.orm import Session, selectinload

from app.core.responses import api_error
from app.models.category import Category
from app.models.feature_request import PromotionOrder
from app.models.listing import PUBLIC_LISTING_STATUSES, Listing
from app.models.user import User
from app.services.email_service import EmailService
from app.services.notification_service import NotificationService

PROMOTION_PACKAGES: dict[str, list[dict[str, object]]] = {
    "featured": [
        {
            "type": "featured",
            "option_id": "featured_7",
            "label": "Istaknut oglas",
            "description": "Oglas dobija istaknuti bedž i prednost u listama.",
            "days": 7,
            "price_amount": Decimal("490"),
            "currency": "RSD",
        },
        {
            "type": "featured",
            "option_id": "featured_14",
            "label": "Istaknut oglas",
            "description": "Duže isticanje za oglase koji treba da ostanu vidljivi.",
            "days": 14,
            "price_amount": Decimal("790"),
            "currency": "RSD",
        },
        {
            "type": "featured",
            "option_id": "featured_30",
            "label": "Istaknut oglas",
            "description": "Mesečni paket za opremu koju želite jače da gurate.",
            "days": 30,
            "price_amount": Decimal("1290"),
            "currency": "RSD",
        },
    ],
    "bump": [
        {
            "type": "bump",
            "option_id": "bump_once",
            "label": "Podigni oglas",
            "description": "Oglas skače na vrh rezultata bez promene isticanja.",
            "days": 0,
            "price_amount": Decimal("120"),
            "currency": "RSD",
        }
    ],
    "homepage": [
        {
            "type": "homepage",
            "option_id": "homepage_7",
            "label": "Početna strana",
            "description": "Oglas ulazi u sekciju istaknutih oglasa na početnoj.",
            "days": 7,
            "price_amount": Decimal("2490"),
            "currency": "RSD",
        }
    ],
}

PROMOTION_LABELS = {
    "featured": "Isticanje oglasa",
    "bump": "Podizanje oglasa",
    "homepage": "Promocija na početnoj",
}

REFERENCE_PREFIXES = {
    "featured": "IST",
    "bump": "BMP",
    "homepage": "HOM",
}


class FeatureService:
    def __init__(self, db: Session):
        self.db = db

    def list_packages(self) -> list[dict]:
        return [
            {
                **package,
                "price_amount": str(package["price_amount"]),
            }
            for packages in PROMOTION_PACKAGES.values()
            for package in packages
        ]

    def list_feature_packages(self) -> list[dict]:
        return [
            {"days": package["days"], "price_amount": str(package["price_amount"]), "currency": package["currency"]}
            for package in PROMOTION_PACKAGES["featured"]
        ]

    def list_for_user(self, user: User) -> list[PromotionOrder]:
        return list(
            self.db.scalars(
                select(PromotionOrder)
                .options(selectinload(PromotionOrder.listing))
                .where(PromotionOrder.user_id == user.id)
                .order_by(PromotionOrder.created_at.desc())
            ).all()
        )

    def list_admin(self, status: str | None = None, type_: str | None = None) -> list[PromotionOrder]:
        statement: Select[tuple[PromotionOrder]] = select(PromotionOrder).options(
            selectinload(PromotionOrder.listing),
            selectinload(PromotionOrder.user),
        )
        if status:
            statement = statement.where(PromotionOrder.status == status)
        if type_:
            statement = statement.where(PromotionOrder.type == type_)
        return list(self.db.scalars(statement.order_by(PromotionOrder.created_at.desc()).limit(200)).all())

    def list_homepage_listings(self, limit: int = 12) -> list[Listing]:
        now = datetime.now(UTC)
        return list(
            self.db.scalars(
                select(Listing)
                .join(PromotionOrder, PromotionOrder.listing_id == Listing.id)
                .options(
                    selectinload(Listing.seller).selectinload(User.profile),
                    selectinload(Listing.category).selectinload(Category.attributes),
                    selectinload(Listing.brand),
                    selectinload(Listing.images),
                )
                .where(
                    Listing.status.in_(PUBLIC_LISTING_STATUSES),
                    PromotionOrder.type == "homepage",
                    PromotionOrder.status == "paid",
                    PromotionOrder.starts_at <= now,
                    PromotionOrder.ends_at > now,
                )
                .order_by(PromotionOrder.starts_at.desc(), Listing.created_at.desc())
                .limit(limit)
            ).all()
        )

    def create_request(
        self,
        listing_id: str,
        user: User,
        package_days: int,
        type_: str = "featured",
    ) -> PromotionOrder:
        listing = self.db.get(Listing, listing_id)
        if not listing:
            raise api_error("NOT_FOUND", "Oglas nije pronađen.", 404)
        if listing.seller_id != user.id:
            raise api_error("FORBIDDEN", "Samo vlasnik oglasa može zatražiti promociju.", 403)
        if listing.status != "active":
            raise api_error("VALIDATION_ERROR", "Promocija je dostupna samo za aktivne oglase.", 400)
        package = self._get_package(type_, package_days)

        existing = self.db.scalar(
            select(PromotionOrder).where(
                PromotionOrder.listing_id == listing.id,
                PromotionOrder.type == type_,
                PromotionOrder.status == "pending",
            )
        )
        if existing:
            raise api_error("VALIDATION_ERROR", "Već postoji zahtev za ovu promociju oglasa.", 400)

        prefix = REFERENCE_PREFIXES[type_]
        request = PromotionOrder(
            listing_id=listing.id,
            user_id=user.id,
            type=type_,
            package_days=package_days,
            price_amount=package["price_amount"],
            currency=str(package["currency"]),
            status="pending",
            payment_reference=f"{prefix}-{listing.public_id}-{datetime.now(UTC).strftime('%Y%m%d%H%M%S')}",
        )
        self.db.add(request)
        self.db.commit()
        self.db.refresh(request)
        return request

    def approve(self, request_id: str, admin: User, note: str | None = None) -> PromotionOrder:
        request = self._get_request(request_id)
        if request.status != "pending":
            raise api_error("VALIDATION_ERROR", "Obrađen zahtev nije moguće ponovo potvrditi.", 400)
        listing = self.db.get(Listing, request.listing_id)
        if not listing:
            raise api_error("NOT_FOUND", "Oglas nije pronađen.", 404)

        now = datetime.now(UTC)
        request.status = "paid"
        request.paid_at = now
        request.resolved_by_admin_id = admin.id
        request.admin_note = note

        if request.type == "featured":
            starts_at = max(now, listing.featured_until or now)
            request.starts_at = starts_at
            request.ends_at = starts_at + timedelta(days=request.package_days)
            listing.is_featured = True
            listing.featured_until = request.ends_at
        elif request.type == "bump":
            request.starts_at = now
            request.ends_at = now
            listing.bumped_at = now
        elif request.type == "homepage":
            request.starts_at = now
            request.ends_at = now + timedelta(days=request.package_days)
        else:
            raise api_error("VALIDATION_ERROR", "Nepoznat tip promocije.", 422)

        seller = self.db.get(User, request.user_id)
        if seller:
            EmailService(self.db).send_promotion_started(
                seller,
                listing.title,
                PROMOTION_LABELS.get(request.type, "Promocija"),
                request.ends_at,
            )
            NotificationService(self.db).create(
                recipient_id=seller.id,
                type_="promotion_status",
                deduplication_key=f"promotion-status:{request.id}",
                actor_id=admin.id,
                entity_type="promotion_order",
                entity_id=request.id,
                payload={
                    "title": "Promocija je aktivirana",
                    "body": (
                        f'{PROMOTION_LABELS.get(request.type, "Promocija")} za '
                        f'„{listing.title}” je aktivirana.'
                    ),
                },
                event_id=f"promotion:{request.id}:paid",
                consolidate=True,
            )
        self.db.commit()
        self.db.refresh(request)
        return request

    def reject(self, request_id: str, admin: User, note: str | None = None) -> PromotionOrder:
        request = self._get_request(request_id)
        if request.status != "pending":
            raise api_error("VALIDATION_ERROR", "Obrađen zahtev nije moguće ponovo odbiti.", 400)
        request.status = "rejected"
        request.resolved_by_admin_id = admin.id
        request.admin_note = note
        NotificationService(self.db).create(
            recipient_id=request.user_id,
            type_="promotion_status",
            deduplication_key=f"promotion-status:{request.id}",
            actor_id=admin.id,
            entity_type="promotion_order",
            entity_id=request.id,
            payload={
                "title": "Promocija nije odobrena",
                "body": "Pregledajte status zahteva za promociju oglasa.",
            },
            event_id=f"promotion:{request.id}:rejected",
            consolidate=True,
        )
        self.db.commit()
        self.db.refresh(request)
        return request

    def renew_listing(self, listing_id: str, user: User) -> Listing:
        listing = self.db.get(Listing, listing_id)
        if not listing:
            raise api_error("NOT_FOUND", "Oglas nije pronađen.", 404)
        if listing.seller_id != user.id:
            raise api_error("FORBIDDEN", "Samo vlasnik može obnoviti oglas.", 403)
        if listing.status == "reserved":
            raise api_error(
                "INVALID_LISTING_STATE",
                "Rezervisan oglas nije moguće obnoviti. Prvo uklonite rezervaciju.",
                409,
            )
        if listing.status in {"sold", "draft", "pending_review", "deleted"}:
            raise api_error(
                "INVALID_LISTING_STATE",
                "Oglas u ovom statusu nije moguće obnoviti.",
                409,
            )
        listing.status = "active"
        listing.expires_at = datetime.now(UTC) + timedelta(days=60)
        self.db.commit()
        self.db.refresh(listing)
        return listing

    def _get_package(self, type_: str, package_days: int) -> dict[str, object]:
        packages = PROMOTION_PACKAGES.get(type_)
        if not packages:
            raise api_error("VALIDATION_ERROR", "Nepoznat tip promocije.", 422)
        package = next((item for item in packages if item["days"] == package_days), None)
        if not package:
            allowed = ", ".join(str(item["days"]) for item in packages)
            raise api_error("VALIDATION_ERROR", f"Izaberite paket: {allowed}.", 422)
        return package

    def _get_request(self, request_id: str) -> PromotionOrder:
        request = self.db.scalar(
            select(PromotionOrder)
            .options(selectinload(PromotionOrder.listing), selectinload(PromotionOrder.user))
            .where(PromotionOrder.id == request_id)
        )
        if not request:
            raise api_error("NOT_FOUND", "Zahtev nije pronađen.", 404)
        return request


def serialize_feature_request(request: PromotionOrder) -> dict:
    return {
        "id": request.id,
        "listing_id": request.listing_id,
        "listing": (
            {"id": request.listing.id, "title": request.listing.title, "slug": request.listing.slug}
            if request.listing
            else None
        ),
        "user_id": request.user_id,
        "user": (
            {"id": request.user.id, "email": request.user.email, "username": request.user.username}
            if request.user
            else None
        ),
        "type": request.type,
        "type_label": PROMOTION_LABELS.get(request.type, request.type),
        "package_days": request.package_days,
        "price_amount": str(request.price_amount),
        "currency": request.currency,
        "status": request.status,
        "payment_reference": request.payment_reference,
        "admin_note": request.admin_note,
        "paid_at": request.paid_at,
        "starts_at": request.starts_at,
        "ends_at": request.ends_at,
        "created_at": request.created_at,
    }
