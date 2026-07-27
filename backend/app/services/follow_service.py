from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import and_, delete, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, aliased, selectinload

from app.core.responses import api_error
from app.models.category import Category
from app.models.conversation_safety import UserBlock
from app.models.listing import PUBLIC_LISTING_STATUSES, Listing
from app.models.profile import UserProfile
from app.models.seller_follow import SellerFollow
from app.models.user import User
from app.services.email_service import EmailService
from app.services.notification_service import NotificationService

# One feed query plus bounded select-in loads for seller/profile, category
# inheritance/attributes, brand, and images. This count must not grow with rows.
FOLLOWING_FEED_QUERY_BUDGET = 7


class FollowService:
    def __init__(self, db: Session):
        self.db = db

    def follow(self, follower: User, seller_id: str) -> SellerFollow:
        if follower.status != "active":
            raise api_error(
                "FOLLOW_UNAVAILABLE",
                "Praćenje trenutno nije dostupno.",
                403,
            )
        if follower.id == seller_id:
            raise api_error(
                "SELF_FOLLOW_NOT_ALLOWED",
                "Ne možete pratiti sopstveni profil.",
                422,
            )
        seller = self.db.scalar(
            select(User).where(User.id == seller_id, User.status == "active")
        )
        if not seller or self._is_blocked(follower.id, seller_id):
            raise api_error("NOT_FOUND", "Prodavac nije pronađen.", 404)
        existing = self._relationship(follower.id, seller_id)
        if existing:
            return existing
        item = SellerFollow(follower_id=follower.id, seller_id=seller_id)
        try:
            with self.db.begin_nested():
                self.db.add(item)
                self.db.flush()
        except IntegrityError:
            item = self._relationship(follower.id, seller_id)
            if not item:
                raise
        self.db.commit()
        return item

    def unfollow(self, follower_id: str, seller_id: str) -> None:
        self.db.execute(
            delete(SellerFollow).where(
                SellerFollow.follower_id == follower_id,
                SellerFollow.seller_id == seller_id,
            )
        )
        self.db.commit()

    def relationship_stats(
        self,
        seller_id: str,
        viewer_id: str | None = None,
    ) -> dict[str, int | bool]:
        active_follower = aliased(User)
        follower_count = int(
            self.db.scalar(
                select(func.count(SellerFollow.id))
                .join(
                    active_follower,
                    active_follower.id == SellerFollow.follower_id,
                )
                .where(
                    SellerFollow.seller_id == seller_id,
                    active_follower.status == "active",
                )
            )
            or 0
        )
        is_following = bool(
            viewer_id
            and viewer_id != seller_id
            and not self._is_blocked(viewer_id, seller_id)
            and self._relationship(viewer_id, seller_id)
        )
        return {
            "follower_count": follower_count,
            "is_following": is_following,
        }

    def list_following(
        self,
        follower_id: str,
        *,
        cursor: str | None = None,
        limit: int = 20,
    ) -> tuple[list[dict], str | None]:
        limit = min(max(limit, 1), 50)
        seller = aliased(User)
        statement = (
            select(SellerFollow, seller, UserProfile)
            .join(seller, seller.id == SellerFollow.seller_id)
            .outerjoin(UserProfile, UserProfile.user_id == seller.id)
            .where(
                SellerFollow.follower_id == follower_id,
                seller.status == "active",
                ~self._blocked_exists(follower_id, SellerFollow.seller_id),
            )
        )
        if cursor:
            anchor = self.db.scalar(
                select(SellerFollow).where(
                    SellerFollow.id == cursor,
                    SellerFollow.follower_id == follower_id,
                )
            )
            if not anchor:
                raise api_error("INVALID_CURSOR", "Kursor nije ispravan.", 400)
            statement = statement.where(
                or_(
                    SellerFollow.created_at < anchor.created_at,
                    and_(
                        SellerFollow.created_at == anchor.created_at,
                        SellerFollow.id < anchor.id,
                    ),
                )
            )
        rows = self.db.execute(
            statement.order_by(
                SellerFollow.created_at.desc(),
                SellerFollow.id.desc(),
            ).limit(limit + 1)
        ).all()
        next_cursor = rows[limit - 1][0].id if len(rows) > limit else None
        data = [
            {
                "follow_id": follow.id,
                "followed_at": follow.created_at,
                "seller": {
                    "id": item.id,
                    "username": item.username,
                    "display_name": profile.display_name if profile else None,
                    "city": profile.city if profile else None,
                    "shop_name": (
                        profile.shop_name if _is_active_shop(profile) else None
                    ),
                    "shop_slug": (
                        profile.shop_slug if _is_active_shop(profile) else None
                    ),
                    "shop_logo_url": (
                        profile.shop_logo_url if _is_active_shop(profile) else None
                    ),
                },
            }
            for follow, item, profile in rows[:limit]
        ]
        return data, next_cursor

    def feed(
        self,
        follower_id: str,
        *,
        cursor: str | None = None,
        limit: int = 24,
    ) -> tuple[list[Listing], str | None]:
        limit = min(max(limit, 1), 48)
        now = datetime.now(UTC)
        freshness = func.coalesce(Listing.bumped_at, Listing.created_at)
        statement = (
            select(Listing)
            .join(
                SellerFollow,
                and_(
                    SellerFollow.seller_id == Listing.seller_id,
                    SellerFollow.follower_id == follower_id,
                ),
            )
            .join(User, User.id == Listing.seller_id)
            .options(
                selectinload(Listing.seller).selectinload(User.profile),
                selectinload(Listing.category).selectinload(Category.attributes),
                selectinload(Listing.category)
                .selectinload(Category.parent)
                .selectinload(Category.attributes),
                selectinload(Listing.brand),
                selectinload(Listing.images),
            )
            .where(
                User.status == "active",
                Listing.status.in_(PUBLIC_LISTING_STATUSES),
                or_(Listing.expires_at.is_(None), Listing.expires_at > now),
                ~self._blocked_exists(follower_id, Listing.seller_id),
            )
        )
        if cursor:
            anchor = self.db.scalar(
                select(Listing)
                .join(
                    SellerFollow,
                    and_(
                        SellerFollow.seller_id == Listing.seller_id,
                        SellerFollow.follower_id == follower_id,
                    ),
                )
                .join(User, User.id == Listing.seller_id)
                .where(
                    Listing.id == cursor,
                    User.status == "active",
                    Listing.status.in_(PUBLIC_LISTING_STATUSES),
                    or_(Listing.expires_at.is_(None), Listing.expires_at > now),
                    ~self._blocked_exists(follower_id, Listing.seller_id),
                )
            )
            if not anchor:
                raise api_error("INVALID_CURSOR", "Kursor nije ispravan.", 400)
            anchor_freshness = anchor.bumped_at or anchor.created_at
            statement = statement.where(
                or_(
                    freshness < anchor_freshness,
                    and_(freshness == anchor_freshness, Listing.id < anchor.id),
                )
            )
        rows = list(
            self.db.scalars(
                statement.order_by(freshness.desc(), Listing.id.desc()).limit(limit + 1)
            ).all()
        )
        next_cursor = rows[limit - 1].id if len(rows) > limit else None
        return rows[:limit], next_cursor

    def notify_listing_active(self, listing: Listing) -> int:
        if listing.status != "active":
            return 0
        follower = aliased(User)
        follower_ids = list(
            self.db.scalars(
                select(SellerFollow.follower_id)
                .join(follower, follower.id == SellerFollow.follower_id)
                .where(
                    SellerFollow.seller_id == listing.seller_id,
                    follower.status == "active",
                    ~self._blocked_exists(
                        SellerFollow.follower_id,
                        listing.seller_id,
                    ),
                )
            ).all()
        )
        day = (listing.approved_at or datetime.now(UTC)).date().isoformat()
        created = 0
        notifications = NotificationService(self.db)
        for follower_id in follower_ids:
            item = notifications.create(
                recipient_id=follower_id,
                type_="followed_seller_listing",
                deduplication_key=(
                    f"followed-seller-listings:{listing.seller_id}:{day}"
                ),
                actor_id=listing.seller_id,
                entity_type="listing",
                entity_id=listing.id,
                payload={
                    "title": "Novi oglas prodavca kog pratite",
                    "body": f'Objavljen je oglas „{listing.title}”.',
                },
                event_id=f"listing-active:{listing.id}",
                consolidate=True,
            )
            created += int(item is not None)
        return created

    def _relationship(
        self,
        follower_id: str,
        seller_id: str,
    ) -> SellerFollow | None:
        return self.db.scalar(
            select(SellerFollow).where(
                SellerFollow.follower_id == follower_id,
                SellerFollow.seller_id == seller_id,
            )
        )

    def _is_blocked(self, first_id: str, second_id: str) -> bool:
        return self.db.scalar(
            select(UserBlock.id).where(
                or_(
                    and_(
                        UserBlock.blocker_id == first_id,
                        UserBlock.blocked_id == second_id,
                    ),
                    and_(
                        UserBlock.blocker_id == second_id,
                        UserBlock.blocked_id == first_id,
                    ),
                )
            )
        ) is not None

    @staticmethod
    def _blocked_exists(first_id, second_id):
        return select(UserBlock.id).where(
            or_(
                and_(
                    UserBlock.blocker_id == first_id,
                    UserBlock.blocked_id == second_id,
                ),
                and_(
                    UserBlock.blocker_id == second_id,
                    UserBlock.blocked_id == first_id,
                ),
            )
        ).exists()


def send_followed_seller_digests(db: Session, limit: int = 100) -> int:
    now = datetime.now(UTC)
    cutoff = now - timedelta(days=1)
    recipients = list(
        db.scalars(
            select(User)
            .join(UserProfile, UserProfile.user_id == User.id)
            .options(selectinload(User.profile))
            .where(
                User.status == "active",
                UserProfile.notify_followed_sellers.is_(True),
                or_(
                    UserProfile.followed_seller_digest_sent_at.is_(None),
                    UserProfile.followed_seller_digest_sent_at <= cutoff,
                ),
            )
            .order_by(
                UserProfile.followed_seller_digest_sent_at.asc().nullsfirst(),
                User.id,
            )
            .limit(limit)
        ).all()
    )
    sent = 0
    for recipient in recipients:
        profile = recipient.profile
        since = (
            profile.followed_seller_digest_sent_at
            if profile and profile.followed_seller_digest_sent_at
            else cutoff
        )
        listings, _ = FollowService(db).feed(recipient.id, limit=48)
        fresh = [
            item
            for item in listings
            if item.approved_at and _as_utc(item.approved_at) > _as_utc(since)
        ]
        if fresh:
            EmailService(db).send_followed_seller_digest(recipient, fresh)
            sent += 1
        if profile:
            profile.followed_seller_digest_sent_at = now
    db.commit()
    return sent


def _as_utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=UTC)


def _is_active_shop(profile: UserProfile | None) -> bool:
    return bool(
        profile
        and profile.shop_name
        and profile.shop_slug
        and profile.shop_active_until
        and _as_utc(profile.shop_active_until) > datetime.now(UTC)
    )
