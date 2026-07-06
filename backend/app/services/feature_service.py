from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.responses import api_error
from app.models.feature_request import FeatureRequest
from app.models.listing import Listing
from app.models.user import User
from app.services.email_service import EmailService

FEATURE_PACKAGES: dict[int, Decimal] = {
    7: Decimal("490"),
    14: Decimal("790"),
    30: Decimal("1290"),
}


class FeatureService:
    def __init__(self, db: Session):
        self.db = db

    def list_packages(self) -> list[dict]:
        return [
            {"days": days, "price_amount": str(price), "currency": "RSD"}
            for days, price in FEATURE_PACKAGES.items()
        ]

    def list_for_user(self, user: User) -> list[FeatureRequest]:
        return list(
            self.db.scalars(
                select(FeatureRequest)
                .options(selectinload(FeatureRequest.listing))
                .where(FeatureRequest.user_id == user.id)
                .order_by(FeatureRequest.created_at.desc())
            ).all()
        )

    def list_admin(self, status: str | None = None) -> list[FeatureRequest]:
        statement = select(FeatureRequest).options(
            selectinload(FeatureRequest.listing),
            selectinload(FeatureRequest.user),
        )
        if status:
            statement = statement.where(FeatureRequest.status == status)
        return list(self.db.scalars(statement.order_by(FeatureRequest.created_at.desc()).limit(200)).all())

    def create_request(self, listing_id: str, user: User, package_days: int) -> FeatureRequest:
        listing = self.db.get(Listing, listing_id)
        if not listing:
            raise api_error("NOT_FOUND", "Oglas nije pronađen.", 404)
        if listing.seller_id != user.id:
            raise api_error("FORBIDDEN", "Samo vlasnik oglasa može zatražiti isticanje.", 403)
        if listing.status != "active":
            raise api_error("VALIDATION_ERROR", "Isticanje je dostupno samo za aktivne oglase.", 400)
        price = FEATURE_PACKAGES.get(package_days)
        if price is None:
            raise api_error("VALIDATION_ERROR", "Izaberite paket od 7, 14 ili 30 dana.", 422)

        existing = self.db.scalar(
            select(FeatureRequest).where(
                FeatureRequest.listing_id == listing.id,
                FeatureRequest.status == "pending",
            )
        )
        if existing:
            raise api_error("VALIDATION_ERROR", "Već postoji zahtev za isticanje ovog oglasa.", 400)

        request = FeatureRequest(
            listing_id=listing.id,
            user_id=user.id,
            package_days=package_days,
            price_amount=price,
            currency="RSD",
            status="pending",
            payment_reference=f"IST-{listing.public_id}-{datetime.now(UTC).strftime('%Y%m%d%H%M%S')}",
        )
        self.db.add(request)
        self.db.commit()
        self.db.refresh(request)
        return request

    def approve(self, request_id: str, admin: User, note: str | None = None) -> FeatureRequest:
        request = self._get_request(request_id)
        if request.status != "pending":
            raise api_error("VALIDATION_ERROR", "Obrađen zahtev nije moguće ponovo potvrditi.", 400)
        listing = self.db.get(Listing, request.listing_id)
        if not listing:
            raise api_error("NOT_FOUND", "Oglas nije pronađen.", 404)
        starts_at = max(datetime.now(UTC), listing.featured_until or datetime.now(UTC))
        listing.is_featured = True
        listing.featured_until = starts_at + timedelta(days=request.package_days)
        request.status = "paid"
        request.paid_at = datetime.now(UTC)
        request.resolved_by_admin_id = admin.id
        request.admin_note = note
        seller = self.db.get(User, request.user_id)
        if seller:
            EmailService(self.db).send_feature_started(seller, listing.title, listing.featured_until)
        self.db.commit()
        self.db.refresh(request)
        return request

    def reject(self, request_id: str, admin: User, note: str | None = None) -> FeatureRequest:
        request = self._get_request(request_id)
        if request.status != "pending":
            raise api_error("VALIDATION_ERROR", "Obrađen zahtev nije moguće ponovo odbiti.", 400)
        request.status = "rejected"
        request.resolved_by_admin_id = admin.id
        request.admin_note = note
        self.db.commit()
        self.db.refresh(request)
        return request

    def renew_listing(self, listing_id: str, user: User) -> Listing:
        listing = self.db.get(Listing, listing_id)
        if not listing:
            raise api_error("NOT_FOUND", "Oglas nije pronađen.", 404)
        if listing.seller_id != user.id:
            raise api_error("FORBIDDEN", "Samo vlasnik može obnoviti oglas.", 403)
        listing.status = "active"
        listing.expires_at = datetime.now(UTC) + timedelta(days=60)
        self.db.commit()
        self.db.refresh(listing)
        return listing

    def _get_request(self, request_id: str) -> FeatureRequest:
        request = self.db.scalar(
            select(FeatureRequest)
            .options(selectinload(FeatureRequest.listing), selectinload(FeatureRequest.user))
            .where(FeatureRequest.id == request_id)
        )
        if not request:
            raise api_error("NOT_FOUND", "Zahtev nije pronađen.", 404)
        return request


def serialize_feature_request(request: FeatureRequest) -> dict:
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
        "package_days": request.package_days,
        "price_amount": str(request.price_amount),
        "currency": request.currency,
        "status": request.status,
        "payment_reference": request.payment_reference,
        "admin_note": request.admin_note,
        "paid_at": request.paid_at,
        "created_at": request.created_at,
    }
