from __future__ import annotations

from datetime import UTC, datetime, timedelta
from decimal import Decimal
from secrets import token_hex

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session, selectinload

from app.core.responses import api_error
from app.models.category import Category
from app.models.listing import PUBLIC_LISTING_STATUSES, Listing
from app.models.profile import UserProfile
from app.models.shop_subscription import ShopSubscriptionRequest
from app.models.user import User
from app.schemas.shop import ShopProfileUpdate
from app.services.email_service import EmailService
from app.services.notification_service import NotificationService
from app.services.listing_service import serialize_listing_card, slugify

SHOP_SUBSCRIPTION_PLANS: dict[str, dict[str, object]] = {
    "monthly": {
        "plan": "monthly",
        "label": "Mesečna prodavnica",
        "description": "Prodavnica, bedž i veći limit oglasa na 30 dana.",
        "days": 30,
        "price_amount": Decimal("1990.00"),
        "currency": "RSD",
    },
    "yearly": {
        "plan": "yearly",
        "label": "Godišnja prodavnica",
        "description": "Prodavnica, bedž i veći limit oglasa na 365 dana.",
        "days": 365,
        "price_amount": Decimal("19900.00"),
        "currency": "RSD",
    },
}


class ShopService:
    def __init__(self, db: Session):
        self.db = db

    @staticmethod
    def is_shop_active(profile: UserProfile | None, now: datetime | None = None) -> bool:
        if not profile or not profile.shop_name or not profile.shop_slug or not profile.shop_active_until:
            return False
        current = now or datetime.now(UTC)
        active_until = _as_utc(profile.shop_active_until)
        return active_until > current

    def list_plans(self) -> list[dict]:
        return [_serialize_plan(plan) for plan in SHOP_SUBSCRIPTION_PLANS.values()]

    def get_me(self, user: User) -> dict:
        profile = self._ensure_profile(user)
        return serialize_shop_profile(profile)

    def update_profile(self, user: User, payload: ShopProfileUpdate) -> dict:
        profile = self._ensure_profile(user)
        data = payload.model_dump(exclude_unset=True)
        if "shop_name" in data and data["shop_name"]:
            profile.shop_name = data["shop_name"].strip()
            if not profile.shop_slug:
                profile.shop_slug = self._unique_slug(profile.shop_name)
        for key in ["shop_logo_url", "shop_description", "shop_tax_id", "shop_registration_number"]:
            if key in data:
                value = data[key]
                setattr(profile, key, value.strip() if isinstance(value, str) and value.strip() else None)
        self.db.commit()
        self.db.refresh(profile)
        return serialize_shop_profile(profile)

    def list_my_requests(self, user: User) -> list[ShopSubscriptionRequest]:
        return list(
            self.db.scalars(
                select(ShopSubscriptionRequest)
                .where(ShopSubscriptionRequest.user_id == user.id)
                .order_by(ShopSubscriptionRequest.created_at.desc())
            ).all()
        )

    def create_subscription_request(self, user: User, plan: str) -> ShopSubscriptionRequest:
        profile = self._ensure_profile(user)
        if not profile.shop_name or not profile.shop_tax_id:
            raise api_error("VALIDATION_ERROR", "Unesite naziv prodavnice i PIB pre zahteva za pretplatu.", 422)
        package = self._get_plan(plan)
        pending = self.db.scalar(
            select(ShopSubscriptionRequest).where(
                ShopSubscriptionRequest.user_id == user.id,
                ShopSubscriptionRequest.status == "pending",
            )
        )
        if pending:
            raise api_error("ALREADY_PENDING", "Već imate zahtev za prodavnicu koji čeka obradu.", 409)
        request = ShopSubscriptionRequest(
            user_id=user.id,
            plan=plan,
            price_amount=package["price_amount"],
            currency=str(package["currency"]),
            status="pending",
            payment_reference=f"SHOP-{token_hex(4).upper()}",
        )
        self.db.add(request)
        self.db.commit()
        self.db.refresh(request)
        return request

    def list_public_shops(self, limit: int = 100) -> list[UserProfile]:
        now = datetime.now(UTC)
        return list(
            self.db.scalars(
                select(UserProfile)
                .join(User, User.id == UserProfile.user_id)
                .options(selectinload(UserProfile.user))
                .where(
                    User.status == "active",
                    UserProfile.shop_name.is_not(None),
                    UserProfile.shop_slug.is_not(None),
                    UserProfile.shop_active_until.is_not(None),
                    UserProfile.shop_active_until > now,
                )
                .order_by(UserProfile.shop_name.asc())
                .limit(limit)
            ).all()
        )

    def get_public_shop(self, slug: str) -> UserProfile:
        profile = self.db.scalar(
            select(UserProfile)
            .options(selectinload(UserProfile.user))
            .where(UserProfile.shop_slug == slug)
        )
        if (
            not profile
            or profile.user.status != "active"
            or not self.is_shop_active(profile)
        ):
            raise api_error("NOT_FOUND", "Prodavnica nije pronađena.", 404)
        return profile

    def shop_listings(self, profile: UserProfile) -> list[Listing]:
        return list(
            self.db.scalars(
                select(Listing)
                .options(
                    selectinload(Listing.seller).selectinload(User.profile),
                    selectinload(Listing.category).selectinload(Category.attributes),
                    selectinload(Listing.brand),
                    selectinload(Listing.images),
                )
                .where(
                    Listing.seller_id == profile.user_id,
                    Listing.status.in_(PUBLIC_LISTING_STATUSES),
                )
                .order_by(Listing.is_featured.desc(), func.coalesce(Listing.bumped_at, Listing.created_at).desc())
            ).all()
        )

    def list_admin_requests(self, status: str | None = None) -> list[ShopSubscriptionRequest]:
        statement: Select[tuple[ShopSubscriptionRequest]] = select(ShopSubscriptionRequest).options(
            selectinload(ShopSubscriptionRequest.user).selectinload(User.profile)
        )
        if status:
            statement = statement.where(ShopSubscriptionRequest.status == status)
        return list(self.db.scalars(statement.order_by(ShopSubscriptionRequest.created_at.desc()).limit(200)).all())

    def list_admin_shops(self) -> list[User]:
        return list(
            self.db.scalars(
                select(User)
                .options(selectinload(User.profile))
                .join(UserProfile, UserProfile.user_id == User.id)
                .where(UserProfile.shop_name.is_not(None))
                .order_by(UserProfile.shop_name.asc())
                .limit(200)
            ).all()
        )

    def approve_request(self, request_id: str, admin: User, note: str | None = None) -> ShopSubscriptionRequest:
        request = self._get_request(request_id)
        if request.status != "pending":
            raise api_error("VALIDATION_ERROR", "Zahtev je već obrađen.", 400)
        package = self._get_plan(request.plan)
        profile = self._ensure_profile(request.user)
        if not profile.shop_name:
            raise api_error("VALIDATION_ERROR", "Korisnik nema podešen naziv prodavnice.", 422)
        if not profile.shop_slug:
            profile.shop_slug = self._unique_slug(profile.shop_name)
        now = datetime.now(UTC)
        starts_at = max(now, _as_utc(profile.shop_active_until) if profile.shop_active_until else now)
        ends_at = starts_at + timedelta(days=int(package["days"]))
        profile.shop_active_until = ends_at
        profile.shop_expiry_notice_sent_at = None
        request.status = "paid"
        request.admin_note = note
        request.activated_at = now
        request.starts_at = starts_at
        request.ends_at = ends_at
        request.resolved_by_admin_id = admin.id
        EmailService(self.db).send_shop_subscription_started(request.user, profile.shop_name, ends_at)
        NotificationService(self.db).create(
            recipient_id=request.user_id,
            type_="shop_subscription_status",
            deduplication_key=f"shop-subscription-status:{request.id}",
            actor_id=admin.id,
            entity_type="shop_subscription",
            entity_id=request.id,
            payload={
                "title": "Paket prodavnice je aktiviran",
                "body": f'Paket za prodavnicu „{profile.shop_name}” je aktivan.',
            },
            event_id=f"shop-subscription:{request.id}:paid",
            consolidate=True,
        )
        self.db.commit()
        self.db.refresh(request)
        return request

    def reject_request(self, request_id: str, admin: User, note: str | None = None) -> ShopSubscriptionRequest:
        request = self._get_request(request_id)
        if request.status != "pending":
            raise api_error("VALIDATION_ERROR", "Zahtev je već obrađen.", 400)
        request.status = "rejected"
        request.admin_note = note
        request.resolved_by_admin_id = admin.id
        NotificationService(self.db).create(
            recipient_id=request.user_id,
            type_="shop_subscription_status",
            deduplication_key=f"shop-subscription-status:{request.id}",
            actor_id=admin.id,
            entity_type="shop_subscription",
            entity_id=request.id,
            payload={
                "title": "Paket prodavnice nije odobren",
                "body": "Pregledajte status zahteva za paket prodavnice.",
            },
            event_id=f"shop-subscription:{request.id}:rejected",
            consolidate=True,
        )
        self.db.commit()
        self.db.refresh(request)
        return request

    def deactivate_shop(self, user_id: str) -> UserProfile:
        user = self.db.scalar(select(User).options(selectinload(User.profile)).where(User.id == user_id))
        if not user or not user.profile or not user.profile.shop_name:
            raise api_error("NOT_FOUND", "Prodavnica nije pronađena.", 404)
        user.profile.shop_active_until = datetime.now(UTC)
        self.db.commit()
        self.db.refresh(user.profile)
        return user.profile

    def _ensure_profile(self, user: User) -> UserProfile:
        if not user.profile:
            user.profile = UserProfile(display_name=user.username)
            self.db.add(user.profile)
            self.db.flush()
        return user.profile

    def _get_plan(self, plan: str) -> dict[str, object]:
        package = SHOP_SUBSCRIPTION_PLANS.get(plan)
        if not package:
            raise api_error("VALIDATION_ERROR", "Nepoznat paket prodavnice.", 422)
        return package

    def _get_request(self, request_id: str) -> ShopSubscriptionRequest:
        request = self.db.scalar(
            select(ShopSubscriptionRequest)
            .options(selectinload(ShopSubscriptionRequest.user).selectinload(User.profile))
            .where(ShopSubscriptionRequest.id == request_id)
        )
        if not request:
            raise api_error("NOT_FOUND", "Zahtev nije pronađen.", 404)
        return request

    def _unique_slug(self, name: str) -> str:
        base = slugify(name)
        candidate = base
        suffix = 2
        while self.db.scalar(select(UserProfile).where(UserProfile.shop_slug == candidate)):
            candidate = f"{base}-{suffix}"
            suffix += 1
        return candidate


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _serialize_plan(plan: dict[str, object]) -> dict:
    return {
        **plan,
        "price_amount": str(plan["price_amount"]),
    }


def serialize_shop_profile(profile: UserProfile | None) -> dict:
    active = ShopService.is_shop_active(profile)
    return {
        "shop_name": profile.shop_name if profile else None,
        "shop_slug": profile.shop_slug if profile else None,
        "shop_logo_url": profile.shop_logo_url if profile else None,
        "shop_description": profile.shop_description if profile else None,
        "shop_tax_id": profile.shop_tax_id if profile else None,
        "shop_registration_number": profile.shop_registration_number if profile else None,
        "shop_active_until": profile.shop_active_until if profile else None,
        "shop_active": active,
        "listing_limit": 100 if active else 10,
    }


def serialize_shop_subscription_request(request: ShopSubscriptionRequest) -> dict:
    package = SHOP_SUBSCRIPTION_PLANS.get(request.plan, {})
    profile = request.user.profile if request.user else None
    return {
        "id": request.id,
        "user_id": request.user_id,
        "user": (
            {
                "id": request.user.id,
                "email": request.user.email,
                "username": request.user.username,
                "shop_name": profile.shop_name if profile else None,
            }
            if request.user
            else None
        ),
        "plan": request.plan,
        "plan_label": str(package.get("label", request.plan)),
        "price_amount": str(request.price_amount),
        "currency": request.currency,
        "status": request.status,
        "payment_reference": request.payment_reference,
        "admin_note": request.admin_note,
        "activated_at": request.activated_at,
        "starts_at": request.starts_at,
        "ends_at": request.ends_at,
        "created_at": request.created_at,
    }


def serialize_shop_summary(profile: UserProfile, listings: list[Listing] | None = None) -> dict:
    return {
        "user_id": profile.user_id,
        "username": profile.user.username if profile.user else None,
        **serialize_shop_profile(profile),
        "active_listings_count": len(listings) if listings is not None else None,
    }


def serialize_shop_detail(profile: UserProfile, listings: list[Listing]) -> dict:
    return {
        **serialize_shop_summary(profile, listings),
        "listings": [serialize_listing_card(listing) for listing in listings],
    }
