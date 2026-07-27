from datetime import UTC, datetime

from sqlalchemy import func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.responses import api_error
from app.core.security import hash_token
from app.models.feature_request import PromotionOrder
from app.models.conversation_safety import UserBlock
from app.models.listing import Listing
from app.models.message import Conversation
from app.models.notification import UserNotification
from app.models.profile import UserProfile
from app.models.review import Review
from app.models.saved_search import SavedSearch
from app.models.shop_subscription import ShopSubscriptionRequest
from app.models.user import User

NOTIFICATION_TYPES = {
    "new_message",
    "listing_approved",
    "listing_rejected",
    "listing_expiring",
    "listing_expired",
    "listing_reserved",
    "listing_sold",
    "saved_search_matches",
    "followed_seller_listing",
    "review_received",
    "promotion_status",
    "shop_subscription_status",
    "moderation_status",
}
SAFE_PAYLOAD_LIMITS = {"title": 140, "body": 300}
DEFAULT_COPY = {
    "new_message": ("Nova poruka", "Imate novu poruku u razgovoru."),
    "listing_approved": ("Oglas je odobren", "Vaš oglas je objavljen."),
    "listing_rejected": ("Oglas nije odobren", "Pregledajte status svog oglasa."),
    "listing_expiring": ("Oglas uskoro ističe", "Obnovite oglas ako je i dalje aktuelan."),
    "listing_expired": ("Oglas je istekao", "Oglas više nije aktivan."),
    "listing_reserved": ("Oglas je rezervisan", "Status oglasa je promenjen."),
    "listing_sold": ("Oglas je prodat", "Status oglasa je promenjen."),
    "saved_search_matches": (
        "Novi oglasi za sačuvanu pretragu",
        "Pronašli smo nove oglase koji odgovaraju vašoj pretrazi.",
    ),
    "followed_seller_listing": (
        "Novi oglas prodavca kog pratite",
        "Prodavac kog pratite objavio je novi oglas.",
    ),
    "review_received": ("Dobili ste novu ocenu", "Pogledajte novu ocenu na svom profilu."),
    "promotion_status": ("Status promocije je promenjen", "Pogledajte detalje oglasa."),
    "shop_subscription_status": (
        "Status prodavnice je promenjen",
        "Pogledajte detalje svoje prodavnice.",
    ),
    "moderation_status": (
        "Status moderacije je promenjen",
        "Pogledajte detalje svog sadržaja.",
    ),
}


class NotificationService:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        *,
        recipient_id: str,
        type_: str,
        deduplication_key: str,
        actor_id: str | None = None,
        entity_type: str | None = None,
        entity_id: str | None = None,
        payload: dict | None = None,
        event_id: str | None = None,
        consolidate: bool = False,
    ) -> UserNotification | None:
        if type_ not in NOTIFICATION_TYPES:
            raise ValueError(f"Unsupported notification type: {type_}")
        if actor_id and self.db.scalar(
            select(UserBlock.id).where(
                or_(
                    (UserBlock.blocker_id == recipient_id)
                    & (UserBlock.blocked_id == actor_id),
                    (UserBlock.blocker_id == actor_id)
                    & (UserBlock.blocked_id == recipient_id),
                )
            )
        ):
            return None
        deduplication_key = deduplication_key.strip()[:180]
        if not deduplication_key:
            raise ValueError("A notification deduplication key is required.")
        now = self.utcnow()
        safe_payload = self._safe_payload(type_, payload)
        existing = self.db.scalar(
            select(UserNotification).where(
                UserNotification.recipient_id == recipient_id,
                UserNotification.deduplication_key == deduplication_key,
            )
        )
        if existing:
            return self._merge_existing(
                existing,
                actor_id=actor_id,
                entity_type=entity_type,
                entity_id=entity_id,
                payload=safe_payload,
                event_id=event_id,
                consolidate=consolidate,
                now=now,
            )

        item = UserNotification(
            recipient_id=recipient_id,
            type=type_,
            actor_id=actor_id,
            entity_type=entity_type,
            entity_id=entity_id,
            payload=safe_payload,
            deduplication_key=deduplication_key,
            last_event_id=event_id,
            last_event_at=now,
        )
        try:
            with self.db.begin_nested():
                self.db.add(item)
                self.db.flush()
        except IntegrityError:
            existing = self.db.scalar(
                select(UserNotification).where(
                    UserNotification.recipient_id == recipient_id,
                    UserNotification.deduplication_key == deduplication_key,
                )
            )
            if existing:
                return self._merge_existing(
                    existing,
                    actor_id=actor_id,
                    entity_type=entity_type,
                    entity_id=entity_id,
                    payload=safe_payload,
                    event_id=event_id,
                    consolidate=consolidate,
                    now=now,
                )
            raise
        return item

    def list_for_user(
        self,
        recipient_id: str,
        *,
        cursor: str | None = None,
        limit: int = 20,
    ) -> tuple[list[UserNotification], str | None]:
        limit = min(max(limit, 1), 50)
        statement = select(UserNotification).where(
            UserNotification.recipient_id == recipient_id
        )
        if cursor:
            anchor = self.db.scalar(
                select(UserNotification).where(
                    UserNotification.id == cursor,
                    UserNotification.recipient_id == recipient_id,
                )
            )
            if not anchor:
                raise api_error(
                    "INVALID_CURSOR",
                    "Kursor za obaveštenja nije ispravan.",
                    400,
                )
            statement = statement.where(
                or_(
                    UserNotification.last_event_at < anchor.last_event_at,
                    (
                        UserNotification.last_event_at == anchor.last_event_at
                    )
                    & (UserNotification.id < anchor.id),
                )
            )
        rows = list(
            self.db.scalars(
                statement.order_by(
                    UserNotification.last_event_at.desc(),
                    UserNotification.id.desc(),
                ).limit(limit + 1)
            ).all()
        )
        next_cursor = rows[limit - 1].id if len(rows) > limit else None
        return rows[:limit], next_cursor

    def unread_count(self, recipient_id: str) -> int:
        return int(
            self.db.scalar(
                select(func.count(UserNotification.id)).where(
                    UserNotification.recipient_id == recipient_id,
                    UserNotification.read_at.is_(None),
                )
            )
            or 0
        )

    def mark_read(self, notification_id: str, recipient_id: str) -> UserNotification:
        item = self.db.scalar(
            select(UserNotification).where(
                UserNotification.id == notification_id,
                UserNotification.recipient_id == recipient_id,
            )
        )
        if not item:
            raise api_error("NOT_FOUND", "Obaveštenje nije pronađeno.", 404)
        if item.read_at is None:
            item.read_at = self.utcnow()
            self.db.commit()
            self.db.refresh(item)
        return item

    def mark_all_read(self, recipient_id: str) -> int:
        result = self.db.execute(
            update(UserNotification)
            .where(
                UserNotification.recipient_id == recipient_id,
                UserNotification.read_at.is_(None),
            )
            .values(read_at=self.utcnow())
        )
        self.db.commit()
        return int(result.rowcount or 0)

    def mark_entity_read(
        self,
        recipient_id: str,
        entity_type: str,
        entity_id: str,
    ) -> int:
        result = self.db.execute(
            update(UserNotification)
            .where(
                UserNotification.recipient_id == recipient_id,
                UserNotification.entity_type == entity_type,
                UserNotification.entity_id == entity_id,
                UserNotification.read_at.is_(None),
            )
            .values(read_at=self.utcnow())
        )
        return int(result.rowcount or 0)

    def serialize(self, item: UserNotification, recipient_id: str) -> dict:
        href = self._authorized_href(item, recipient_id)
        accessible = href is not None or item.entity_type is None
        title, body = self._copy(item)
        if not accessible:
            title = "Obaveštenje više nije dostupno"
            body = "Povezani sadržaj je uklonjen ili više nije dostupan."
        return {
            "id": item.id,
            "type": item.type,
            "title": title,
            "body": body,
            "href": href,
            "is_accessible": accessible,
            "group_count": item.group_count,
            "read_at": item.read_at,
            "created_at": item.created_at,
            "last_event_at": item.last_event_at,
        }

    def unsubscribe_all_email(self, token: str) -> User:
        user = self.db.scalar(select(User).where(User.email_unsubscribe_token_hash == hash_token(token)))
        if not user:
            raise api_error("NOT_FOUND", "Link za odjavu nije ispravan.", 404)
        if not user.profile:
            user.profile = UserProfile(display_name=user.username)
        user.profile.notify_messages = False
        user.profile.notify_saved_searches = False
        user.profile.notify_listing_expiry = False
        user.profile.notify_followed_sellers = False
        user.email_unsubscribe_token_hash = None
        self.db.commit()
        self.db.refresh(user)
        return user

    @staticmethod
    def can_send_message_email(user: User) -> bool:
        return bool(not user.profile or user.profile.notify_messages)

    @staticmethod
    def can_send_saved_search_email(user: User) -> bool:
        return bool(not user.profile or user.profile.notify_saved_searches)

    @staticmethod
    def can_send_listing_expiry_email(user: User) -> bool:
        return bool(not user.profile or user.profile.notify_listing_expiry)

    @staticmethod
    def can_send_followed_seller_email(user: User) -> bool:
        return bool(not user.profile or user.profile.notify_followed_sellers)

    @staticmethod
    def utcnow() -> datetime:
        return datetime.now(UTC)

    @staticmethod
    def _safe_payload(type_: str, payload: dict | None) -> dict:
        defaults = DEFAULT_COPY[type_]
        source = payload or {}
        return {
            "title": str(source.get("title") or defaults[0]).strip()[
                : SAFE_PAYLOAD_LIMITS["title"]
            ],
            "body": str(source.get("body") or defaults[1]).strip()[
                : SAFE_PAYLOAD_LIMITS["body"]
            ],
        }

    @staticmethod
    def _copy(item: UserNotification) -> tuple[str, str]:
        defaults = DEFAULT_COPY.get(item.type, ("Novo obaveštenje", ""))
        payload = item.payload if isinstance(item.payload, dict) else {}
        return (
            str(payload.get("title") or defaults[0]),
            str(payload.get("body") or defaults[1]),
        )

    @staticmethod
    def _merge_existing(
        item: UserNotification,
        *,
        actor_id: str | None,
        entity_type: str | None,
        entity_id: str | None,
        payload: dict,
        event_id: str | None,
        consolidate: bool,
        now: datetime,
    ) -> UserNotification:
        if event_id and item.last_event_id == event_id:
            return item
        if consolidate:
            item.actor_id = actor_id
            item.entity_type = entity_type
            item.entity_id = entity_id
            item.payload = payload
            item.last_event_id = event_id
            item.group_count += 1
            item.last_event_at = now
            item.read_at = None
        return item

    def _authorized_href(
        self,
        item: UserNotification,
        recipient_id: str,
    ) -> str | None:
        if not item.entity_type or not item.entity_id:
            return None
        if item.entity_type == "conversation":
            conversation = self.db.get(Conversation, item.entity_id)
            if conversation and recipient_id in {
                conversation.buyer_id,
                conversation.seller_id,
            }:
                return f"/nalog/poruke/{conversation.id}"
            return None
        if item.entity_type == "listing":
            listing = self.db.get(Listing, item.entity_id)
            if not listing or listing.status in {"draft", "deleted"}:
                return None
            if (
                item.type == "followed_seller_listing"
                and listing.status in {"active", "reserved"}
            ):
                seller = self.db.get(User, listing.seller_id)
                if seller and seller.status == "active":
                    return f"/oglasi/{listing.slug}"
                return None
            if listing.seller_id == recipient_id:
                return "/nalog/oglasi"
            if listing.sold_to_user_id == recipient_id:
                return f"/oglasi/{listing.slug}"
            return None
        if item.entity_type == "saved_search":
            saved_search = self.db.get(SavedSearch, item.entity_id)
            return (
                "/nalog/sacuvane-pretrage"
                if saved_search and saved_search.user_id == recipient_id
                else None
            )
        if item.entity_type == "review":
            review = self.db.get(Review, item.entity_id)
            return (
                "/nalog/ocene"
                if review and review.reviewee_id == recipient_id
                else None
            )
        if item.entity_type == "promotion_order":
            order = self.db.get(PromotionOrder, item.entity_id)
            return (
                "/nalog/oglasi"
                if order and order.user_id == recipient_id
                else None
            )
        if item.entity_type == "shop_subscription":
            request = self.db.get(ShopSubscriptionRequest, item.entity_id)
            return (
                "/nalog/prodavnica"
                if request and request.user_id == recipient_id
                else None
            )
        if item.entity_type == "shop":
            return (
                "/nalog/prodavnica"
                if item.entity_id == recipient_id
                else None
            )
        return None
