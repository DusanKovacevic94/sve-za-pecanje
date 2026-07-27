from __future__ import annotations

import io
import json
import zipfile
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from secrets import token_urlsafe

from sqlalchemy import delete, or_, select, update
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.email import enqueue_email, render_action_email
from app.core.private_storage import (
    decrypt_export,
    delete_private_export,
    encrypt_export,
    read_private_export,
    store_private_export,
)
from app.core.responses import api_error
from app.core.security import generate_token, hash_password, hash_token
from app.models.account_privacy import AccountClosure, DataExportRequest
from app.models.audit import AuditLog
from app.models.auth_session import AuthSession
from app.models.conversation_safety import ConversationPreference, UserBlock
from app.models.favorite import Favorite
from app.models.feature_request import PromotionOrder
from app.models.listing import Listing
from app.models.message import Message
from app.models.notification import UserNotification
from app.models.phone_verification import PhoneVerificationChallenge
from app.models.review import Review
from app.models.saved_search import SavedSearch
from app.models.seller_follow import SellerFollow
from app.models.shop_subscription import ShopSubscriptionRequest
from app.models.user import User

EXPORT_COOLDOWN = timedelta(days=7)
EXPORT_LIFETIME = timedelta(hours=24)
CLOSURE_GRACE = timedelta(days=30)
RECENT_AUTH_WINDOW = timedelta(minutes=15)
MAX_EXPORT_ATTEMPTS = 3


def _as_utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=UTC)


def _json_value(value):
    if isinstance(value, datetime):
        return _as_utc(value).isoformat()
    if isinstance(value, Decimal):
        return str(value)
    return value


def _row(model, fields: tuple[str, ...]) -> dict:
    return {field: _json_value(getattr(model, field)) for field in fields}


def _device_label(user_agent: str | None) -> str:
    source = (user_agent or "").lower()
    browser = (
        "Edge"
        if "edg/" in source
        else "Firefox"
        if "firefox/" in source
        else "Chrome"
        if "chrome/" in source
        else "Safari"
        if "safari/" in source
        else "Nepoznat pregledač"
    )
    device = (
        "mobilni uređaj"
        if any(item in source for item in ("mobile", "android", "iphone"))
        else "računar"
    )
    return f"{browser} · {device}"


def send_security_email(db: Session, user: User, title: str, message: str) -> None:
    enqueue_email(
        db,
        user.email,
        f"{title} - Sve Za Pecanje",
        message,
        html=render_action_email(
            title,
            message,
            "Otvori bezbednost naloga",
            f"{settings.app_url.rstrip('/')}/nalog/bezbednost",
        ),
    )


class AccountService:
    def __init__(self, db: Session):
        self.db = db

    def list_sessions(self, user: User, current_session_id: str) -> list[dict]:
        now = datetime.now(UTC)
        sessions = self.db.scalars(
            select(AuthSession)
            .where(
                AuthSession.user_id == user.id,
                AuthSession.revoked_at.is_(None),
                AuthSession.expires_at > now,
            )
            .order_by(AuthSession.last_seen_at.desc().nullslast(), AuthSession.created_at.desc())
        ).all()
        return [
            {
                "id": session.id,
                "device": _device_label(session.user_agent),
                "created_at": session.created_at,
                "last_seen_at": session.last_seen_at,
                "expires_at": session.expires_at,
                "is_current": session.id == current_session_id,
            }
            for session in sessions
        ]

    def revoke_session(
        self,
        user: User,
        current_session_id: str,
        target_session_id: str,
        *,
        ip_address: str | None,
        user_agent: str | None,
    ) -> bool:
        session = self.db.scalar(
            select(AuthSession).where(
                AuthSession.id == target_session_id,
                AuthSession.user_id == user.id,
            )
        )
        if not session:
            raise api_error("NOT_FOUND", "Sesija nije pronađena.", 404)
        if not session.revoked_at:
            session.revoked_at = datetime.now(UTC)
            self.audit(
                user.id,
                "account.session_revoked",
                "auth_session",
                session.id,
                ip_address,
                user_agent,
                {"current": session.id == current_session_id},
            )
            self.db.commit()
        return session.id == current_session_id

    def revoke_other_sessions(
        self,
        user: User,
        current_session_id: str,
        *,
        ip_address: str | None,
        user_agent: str | None,
    ) -> int:
        now = datetime.now(UTC)
        result = self.db.execute(
            update(AuthSession)
            .where(
                AuthSession.user_id == user.id,
                AuthSession.id != current_session_id,
                AuthSession.revoked_at.is_(None),
            )
            .values(revoked_at=now)
        )
        count = int(result.rowcount or 0)
        self.audit(
            user.id,
            "account.other_sessions_revoked",
            "user",
            user.id,
            ip_address,
            user_agent,
            {"count": count},
        )
        send_security_email(
            self.db,
            user,
            "Druge sesije su odjavljene",
            "Sve druge aktivne sesije na vašem nalogu su opozvane. "
            "Ako ovo niste uradili vi, odmah promenite lozinku.",
        )
        self.db.commit()
        return count

    def request_export(
        self,
        user: User,
        *,
        ip_address: str | None,
        user_agent: str | None,
    ) -> DataExportRequest:
        cutoff = datetime.now(UTC) - EXPORT_COOLDOWN
        recent = self.db.scalar(
            select(DataExportRequest)
            .where(
                DataExportRequest.user_id == user.id,
                DataExportRequest.created_at >= cutoff,
            )
            .order_by(DataExportRequest.created_at.desc())
        )
        if recent:
            raise api_error(
                "EXPORT_COOLDOWN",
                "Novi izvoz možete zatražiti sedam dana nakon prethodnog zahteva.",
                429,
                {"available_at": (_as_utc(recent.created_at) + EXPORT_COOLDOWN).isoformat()},
            )
        item = DataExportRequest(user_id=user.id)
        self.db.add(item)
        self.db.flush()
        self.audit(
            user.id,
            "account.export_requested",
            "data_export",
            item.id,
            ip_address,
            user_agent,
        )
        self.db.commit()
        self.db.refresh(item)
        return item

    def list_exports(self, user: User) -> list[dict]:
        rows = self.db.scalars(
            select(DataExportRequest)
            .where(DataExportRequest.user_id == user.id)
            .order_by(DataExportRequest.created_at.desc())
            .limit(10)
        ).all()
        return [
            {
                "id": item.id,
                "status": item.status,
                "created_at": item.created_at,
                "expires_at": item.expires_at,
                "downloaded_at": item.downloaded_at,
            }
            for item in rows
        ]

    def closure_status(self, user: User) -> dict:
        closure = self.db.scalar(
            select(AccountClosure).where(AccountClosure.user_id == user.id)
        )
        return {
            "enabled": settings.account_closure_enabled,
            "status": closure.status if closure else None,
            "requested_at": closure.requested_at if closure else None,
            "scheduled_for": closure.scheduled_for if closure else None,
            "cancelled_at": closure.cancelled_at if closure else None,
        }

    def request_closure(
        self,
        user: User,
        current_session: AuthSession,
        confirmation: str,
        *,
        ip_address: str | None,
        user_agent: str | None,
    ) -> AccountClosure:
        self._require_closure_enabled()
        self._require_recent_auth(current_session)
        if confirmation.strip().upper() != "OBRIŠI":
            raise api_error(
                "CONFIRMATION_REQUIRED",
                "Unesite OBRIŠI da potvrdite zahtev.",
                422,
            )
        existing = self.db.scalar(
            select(AccountClosure).where(AccountClosure.user_id == user.id)
        )
        if existing and existing.status == "grace_period":
            self._revoke_all_sessions(user.id)
            self.db.commit()
            return existing

        listings = list(
            self.db.scalars(
                select(Listing).where(
                    Listing.seller_id == user.id,
                    Listing.status.in_(("active", "reserved")),
                )
            ).all()
        )
        saved_searches = list(
            self.db.scalars(
                select(SavedSearch).where(SavedSearch.user_id == user.id)
            ).all()
        )
        profile = user.profile
        snapshot = {
            "listing_statuses": {listing.id: listing.status for listing in listings},
            "shop_active_until": (
                _as_utc(profile.shop_active_until).isoformat()
                if profile and profile.shop_active_until
                else None
            ),
            "profile_notifications": {
                "messages": profile.notify_messages if profile else True,
                "saved_searches": profile.notify_saved_searches if profile else True,
                "listing_expiry": profile.notify_listing_expiry if profile else True,
                "followed_sellers": (
                    profile.notify_followed_sellers if profile else True
                ),
            },
            "enabled_saved_search_ids": [
                item.id for item in saved_searches if item.notification_enabled
            ],
        }
        now = datetime.now(UTC)
        if existing:
            closure = existing
            closure.status = "grace_period"
            closure.requested_at = now
            closure.scheduled_for = now + CLOSURE_GRACE
            closure.cancelled_at = None
            closure.completed_at = None
            closure.restoration_snapshot = snapshot
        else:
            closure = AccountClosure(
                user_id=user.id,
                requested_at=now,
                scheduled_for=now + CLOSURE_GRACE,
                restoration_snapshot=snapshot,
            )
            self.db.add(closure)
        for listing in listings:
            listing.status = "archived"
            listing.reserved_at = None
            listing.reserved_by_user_id = None
        if profile:
            profile.shop_active_until = None
            profile.notify_messages = False
            profile.notify_saved_searches = False
            profile.notify_listing_expiry = False
            profile.notify_followed_sellers = False
        for saved_search in saved_searches:
            saved_search.notification_enabled = False
        user.status = "pending_deletion"
        self._revoke_all_sessions(user.id)
        self.db.flush()
        self.audit(
            user.id,
            "account.closure_requested",
            "account_closure",
            closure.id,
            ip_address,
            user_agent,
            {"scheduled_for": closure.scheduled_for.isoformat()},
        )
        self.db.commit()
        self.db.refresh(closure)
        return closure

    def cancel_closure(
        self,
        user: User,
        current_session: AuthSession,
        confirmation: str,
        *,
        ip_address: str | None,
        user_agent: str | None,
    ) -> AccountClosure:
        self._require_closure_enabled()
        self._require_recent_auth(current_session)
        if confirmation.strip().upper() != "ZADRŽI":
            raise api_error(
                "CONFIRMATION_REQUIRED",
                "Unesite ZADRŽI da zadržite nalog.",
                422,
            )
        closure = self.db.scalar(
            select(AccountClosure).where(AccountClosure.user_id == user.id)
        )
        if not closure or closure.status != "grace_period":
            raise api_error("NOT_FOUND", "Aktivan zahtev za zatvaranje nije pronađen.", 404)
        if _as_utc(closure.scheduled_for) <= datetime.now(UTC):
            raise api_error("CLOSURE_GRACE_EXPIRED", "Period za otkazivanje je istekao.", 409)
        snapshot = closure.restoration_snapshot or {}
        statuses = snapshot.get("listing_statuses", {})
        listings = self.db.scalars(
            select(Listing).where(
                Listing.seller_id == user.id,
                Listing.id.in_(list(statuses) or [""]),
            )
        ).all()
        for listing in listings:
            if listing.status == "archived":
                listing.status = statuses[listing.id]
        profile = user.profile
        if profile:
            shop_until = snapshot.get("shop_active_until")
            profile.shop_active_until = (
                datetime.fromisoformat(shop_until) if shop_until else None
            )
            preferences = snapshot.get("profile_notifications", {})
            profile.notify_messages = bool(preferences.get("messages", True))
            profile.notify_saved_searches = bool(
                preferences.get("saved_searches", True)
            )
            profile.notify_listing_expiry = bool(
                preferences.get("listing_expiry", True)
            )
            profile.notify_followed_sellers = bool(
                preferences.get("followed_sellers", True)
            )
        enabled_search_ids = snapshot.get("enabled_saved_search_ids", [])
        if enabled_search_ids:
            self.db.execute(
                update(SavedSearch)
                .where(
                    SavedSearch.user_id == user.id,
                    SavedSearch.id.in_(enabled_search_ids),
                )
                .values(notification_enabled=True)
            )
        user.status = "active"
        closure.status = "cancelled"
        closure.cancelled_at = datetime.now(UTC)
        self.audit(
            user.id,
            "account.closure_cancelled",
            "account_closure",
            closure.id,
            ip_address,
            user_agent,
        )
        self.db.commit()
        self.db.refresh(closure)
        return closure

    @staticmethod
    def _require_closure_enabled() -> None:
        if not settings.account_closure_enabled:
            raise api_error(
                "FEATURE_DISABLED",
                "Samostalno zatvaranje naloga trenutno nije omogućeno.",
                403,
            )

    @staticmethod
    def _require_recent_auth(session: AuthSession) -> None:
        if _as_utc(session.created_at) < datetime.now(UTC) - RECENT_AUTH_WINDOW:
            raise api_error(
                "RECENT_AUTH_REQUIRED",
                "Ponovo se prijavite pre ove promene.",
                403,
            )

    def _revoke_all_sessions(self, user_id: str) -> None:
        self.db.execute(
            update(AuthSession)
            .where(
                AuthSession.user_id == user_id,
                AuthSession.revoked_at.is_(None),
            )
            .values(revoked_at=datetime.now(UTC))
        )

    def audit(
        self,
        actor_user_id: str | None,
        action: str,
        entity_type: str,
        entity_id: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
        metadata: dict | None = None,
    ) -> None:
        self.db.add(
            AuditLog(
                actor_user_id=actor_user_id,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                metadata_json=metadata or {},
                ip_address=ip_address,
                user_agent=(user_agent or "")[:300] or None,
            )
        )


def build_export_payload(db: Session, user: User) -> dict:
    profile = user.profile
    listings = list(
        db.scalars(
            select(Listing)
            .options(selectinload(Listing.images))
            .where(Listing.seller_id == user.id)
            .order_by(Listing.created_at)
        ).all()
    )
    messages = list(
        db.scalars(
            select(Message)
            .where(Message.sender_id == user.id)
            .order_by(Message.created_at)
        ).all()
    )
    favorites = list(
        db.scalars(select(Favorite).where(Favorite.user_id == user.id)).all()
    )
    follows = list(
        db.scalars(
            select(SellerFollow)
            .where(SellerFollow.follower_id == user.id)
            .order_by(SellerFollow.created_at)
        ).all()
    )
    searches = list(
        db.scalars(select(SavedSearch).where(SavedSearch.user_id == user.id)).all()
    )
    reviews = list(
        db.scalars(
            select(Review).where(
                or_(Review.reviewer_id == user.id, Review.reviewee_id == user.id)
            )
        ).all()
    )
    promotions = list(
        db.scalars(
            select(PromotionOrder).where(PromotionOrder.user_id == user.id)
        ).all()
    )
    subscriptions = list(
        db.scalars(
            select(ShopSubscriptionRequest).where(
                ShopSubscriptionRequest.user_id == user.id
            )
        ).all()
    )
    sessions = list(
        db.scalars(select(AuthSession).where(AuthSession.user_id == user.id)).all()
    )
    return {
        "format_version": 1,
        "generated_at": datetime.now(UTC).isoformat(),
        "account": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "status": user.status,
            "email_verified_at": _json_value(user.email_verified_at),
            "created_at": _json_value(user.created_at),
            "last_login_at": _json_value(user.last_login_at),
        },
        "profile": (
            _row(
                profile,
                (
                    "display_name",
                    "avatar_url",
                    "city",
                    "municipality",
                    "phone_number",
                    "phone_number_display",
                    "phone_verified_at",
                    "phone_visible",
                    "bio",
                    "fishing_styles",
                    "member_badges",
                    "shop_name",
                    "shop_slug",
                    "shop_logo_url",
                    "shop_description",
                    "shop_tax_id",
                    "shop_registration_number",
                    "shop_active_until",
                    "notify_messages",
                    "notify_saved_searches",
                    "notify_listing_expiry",
                    "notify_followed_sellers",
                    "followed_seller_digest_sent_at",
                ),
            )
            if profile
            else None
        ),
        "listings": [
            {
                **_row(
                    listing,
                    (
                        "id",
                        "public_id",
                        "title",
                        "slug",
                        "description",
                        "condition",
                        "price_type",
                        "price_amount",
                        "currency",
                        "delivery_methods",
                        "delivery_note",
                        "city",
                        "municipality",
                        "status",
                        "attributes",
                        "created_at",
                        "updated_at",
                    ),
                ),
                "images": [
                    {
                        "id": image.id,
                        "url": image.url,
                        "storage_reference": image.storage_key,
                    }
                    for image in listing.images
                ],
            }
            for listing in listings
        ],
        "authored_messages": [
            _row(message, ("id", "conversation_id", "body", "created_at"))
            for message in messages
        ],
        "favorites": [
            _row(favorite, ("listing_id", "created_at")) for favorite in favorites
        ],
        "following": [
            _row(follow, ("seller_id", "created_at")) for follow in follows
        ],
        "saved_searches": [
            _row(
                search,
                (
                    "id",
                    "name",
                    "query",
                    "filters",
                    "notification_enabled",
                    "last_notified_at",
                    "created_at",
                ),
            )
            for search in searches
        ],
        "reviews": [
            _row(
                review,
                (
                    "id",
                    "listing_id",
                    "reviewer_id",
                    "reviewee_id",
                    "rating",
                    "comment",
                    "status",
                    "created_at",
                ),
            )
            for review in reviews
        ],
        "promotions": [
            _row(
                order,
                (
                    "id",
                    "listing_id",
                    "type",
                    "package_days",
                    "price_amount",
                    "currency",
                    "status",
                    "paid_at",
                    "starts_at",
                    "ends_at",
                    "created_at",
                ),
            )
            for order in promotions
        ],
        "shop_subscriptions": [
            _row(
                item,
                (
                    "id",
                    "plan",
                    "price_amount",
                    "currency",
                    "status",
                    "activated_at",
                    "starts_at",
                    "ends_at",
                    "created_at",
                ),
            )
            for item in subscriptions
        ],
        "session_metadata": [
            {
                "device": _device_label(session.user_agent),
                "created_at": _json_value(session.created_at),
                "last_seen_at": _json_value(session.last_seen_at),
                "expires_at": _json_value(session.expires_at),
                "revoked_at": _json_value(session.revoked_at),
            }
            for session in sessions
        ],
    }


def _zip_payload(payload: dict) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr(
            "sve-za-pecanje-export.json",
            json.dumps(payload, ensure_ascii=False, indent=2).encode(),
        )
    return buffer.getvalue()


def process_data_exports(db: Session, limit: int = 10) -> int:
    items = list(
        db.scalars(
            select(DataExportRequest)
            .where(
                DataExportRequest.status == "pending",
                DataExportRequest.attempts < MAX_EXPORT_ATTEMPTS,
            )
            .order_by(DataExportRequest.created_at)
            .limit(limit)
        ).all()
    )
    processed = 0
    for item in items:
        item.status = "processing"
        item.attempts += 1
        db.commit()
        try:
            user = db.get(User, item.user_id)
            if not user or user.status in {"suspended", "deleted"}:
                raise ValueError("Account is unavailable for export.")
            payload = build_export_payload(db, user)
            encrypted = encrypt_export(_zip_payload(payload))
            key = f"private/account-exports/{user.id}/{item.id}.zip.enc"
            item.storage_key = store_private_export(key, encrypted)
            token = generate_token()
            item.download_token_hash = hash_token(token)
            item.expires_at = datetime.now(UTC) + EXPORT_LIFETIME
            item.status = "ready"
            item.last_error = None
            download_url = (
                f"{settings.api_url.rstrip('/')}/api/v1/account/exports/download"
                f"?token={token}"
            )
            enqueue_email(
                db,
                user.email,
                "Vaš izvoz podataka je spreman - Sve Za Pecanje",
                f"Jednokratni link važi 24 sata: {download_url}",
                html=render_action_email(
                    "Izvoz podataka je spreman",
                    "Link se može iskoristiti samo jednom i ističe za 24 sata.",
                    "Preuzmi izvoz",
                    download_url,
                ),
            )
            AccountService(db).audit(
                user.id,
                "account.export_ready",
                "data_export",
                item.id,
                metadata={"expires_at": item.expires_at.isoformat()},
            )
        except Exception as error:
            item.status = (
                "failed" if item.attempts >= MAX_EXPORT_ATTEMPTS else "pending"
            )
            item.last_error = str(error)[:500]
        db.commit()
        processed += 1
    return processed


def download_export(db: Session, token: str) -> tuple[bytes, str]:
    item = db.scalar(
        select(DataExportRequest).where(
            DataExportRequest.download_token_hash == hash_token(token)
        )
    )
    now = datetime.now(UTC)
    if (
        not item
        or item.status != "ready"
        or item.downloaded_at
        or not item.expires_at
        or _as_utc(item.expires_at) <= now
        or not item.storage_key
    ):
        raise api_error(
            "EXPORT_LINK_INVALID",
            "Link za izvoz nije ispravan, iskorišćen je ili je istekao.",
            410,
        )
    archive = decrypt_export(read_private_export(item.storage_key))
    storage_key = item.storage_key
    item.status = "downloaded"
    item.downloaded_at = now
    item.download_token_hash = None
    item.storage_key = None
    AccountService(db).audit(
        item.user_id,
        "account.export_downloaded",
        "data_export",
        item.id,
    )
    db.commit()
    delete_private_export(storage_key)
    return archive, f"sve-za-pecanje-export-{now.date().isoformat()}.zip"


def cleanup_expired_exports(db: Session, limit: int = 100) -> int:
    now = datetime.now(UTC)
    items = list(
        db.scalars(
            select(DataExportRequest)
            .where(
                DataExportRequest.status == "ready",
                DataExportRequest.expires_at <= now,
            )
            .limit(limit)
        ).all()
    )
    for item in items:
        delete_private_export(item.storage_key)
        item.storage_key = None
        item.download_token_hash = None
        item.status = "expired"
    if items:
        db.commit()
    return len(items)


def finalize_account_closures(db: Session, limit: int = 50) -> int:
    now = datetime.now(UTC)
    closures = list(
        db.scalars(
            select(AccountClosure)
            .where(
                AccountClosure.status == "grace_period",
                AccountClosure.scheduled_for <= now,
            )
            .limit(limit)
        ).all()
    )
    for closure in closures:
        user = db.get(User, closure.user_id)
        if not user:
            continue
        tombstone = user.id.replace("-", "")[:12]
        user.email = f"deleted+{tombstone}@invalid.local"
        user.username = f"obrisan_{tombstone}"
        user.password_hash = hash_password(token_urlsafe(32))
        user.status = "deleted"
        user.email_verified_at = None
        user.email_verification_token_hash = None
        user.email_verification_expires_at = None
        user.password_reset_token_hash = None
        user.password_reset_expires_at = None
        user.email_unsubscribe_token_hash = None
        if user.profile:
            profile = user.profile
            profile.display_name = "Obrisan korisnik"
            profile.avatar_url = None
            profile.city = None
            profile.municipality = None
            profile.phone_number = None
            profile.phone_number_display = None
            profile.phone_verified_at = None
            profile.phone_visible = False
            profile.bio = None
            profile.fishing_styles = []
            profile.member_badges = []
            profile.shop_name = None
            profile.shop_slug = None
            profile.shop_logo_url = None
            profile.shop_description = None
            profile.shop_tax_id = None
            profile.shop_registration_number = None
            profile.shop_active_until = None
            profile.notify_followed_sellers = False
            profile.followed_seller_digest_sent_at = None
        db.execute(delete(Favorite).where(Favorite.user_id == user.id))
        db.execute(delete(SavedSearch).where(SavedSearch.user_id == user.id))
        db.execute(
            delete(SellerFollow).where(
                or_(
                    SellerFollow.follower_id == user.id,
                    SellerFollow.seller_id == user.id,
                )
            )
        )
        db.execute(delete(UserNotification).where(UserNotification.recipient_id == user.id))
        db.execute(
            delete(PhoneVerificationChallenge).where(
                PhoneVerificationChallenge.user_id == user.id
            )
        )
        db.execute(
            delete(UserBlock).where(
                or_(UserBlock.blocker_id == user.id, UserBlock.blocked_id == user.id)
            )
        )
        db.execute(
            delete(ConversationPreference).where(
                ConversationPreference.user_id == user.id
            )
        )
        db.execute(
            update(AuthSession)
            .where(AuthSession.user_id == user.id)
            .values(revoked_at=now)
        )
        closure.status = "completed"
        closure.completed_at = now
        AccountService(db).audit(
            None,
            "account.anonymized",
            "account_closure",
            closure.id,
            metadata={"tombstone_user_id": user.id},
        )
    if closures:
        db.commit()
    return len(closures)
