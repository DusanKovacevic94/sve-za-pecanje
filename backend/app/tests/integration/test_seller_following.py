from datetime import UTC, datetime, timedelta

from sqlalchemy import event, func, select

from app.models.conversation_safety import UserBlock
from app.models.email_outbox import EmailOutbox
from app.models.notification import UserNotification
from app.models.seller_follow import SellerFollow
from app.services.follow_service import (
    FOLLOWING_FEED_QUERY_BUDGET,
    FollowService,
    send_followed_seller_digests,
)
from app.services.moderation_service import ModerationService


def test_follow_and_unfollow_are_idempotent_and_validate_accounts(
    client, db, factories, login_user
):
    follower = factories.user()
    seller = factories.user()
    suspended = factories.user()
    suspended.status = "suspended"
    db.commit()
    login_user(follower)

    first = client.post(f"/api/v1/following/sellers/{seller.id}")
    second = client.post(f"/api/v1/following/sellers/{seller.id}")
    assert first.status_code == second.status_code == 200
    assert first.json()["data"] == {
        "follower_count": 1,
        "is_following": True,
    }
    assert db.scalar(select(func.count(SellerFollow.id))) == 1

    self_follow = client.post(f"/api/v1/following/sellers/{follower.id}")
    assert self_follow.status_code == 422
    assert self_follow.json()["error"]["code"] == "SELF_FOLLOW_NOT_ALLOWED"
    hidden = client.post(f"/api/v1/following/sellers/{suspended.id}")
    assert hidden.status_code == 404

    assert client.delete(f"/api/v1/following/sellers/{seller.id}").status_code == 200
    again = client.delete(f"/api/v1/following/sellers/{seller.id}")
    assert again.status_code == 200
    assert again.json()["data"]["is_following"] is False
    assert db.scalar(select(func.count(SellerFollow.id))) == 0


def test_profiles_and_shops_share_private_follow_aggregates(
    client, db, factories, login_user
):
    follower = factories.user()
    seller = factories.user()
    seller.profile.shop_name = "Dunav oprema"
    seller.profile.shop_slug = "dunav-oprema-follow"
    seller.profile.shop_active_until = datetime.now(UTC) + timedelta(days=30)
    db.commit()
    login_user(follower)
    client.post(f"/api/v1/following/sellers/{seller.id}")

    profile = client.get(f"/api/v1/users/profile/{seller.username}")
    shop = client.get(f"/api/v1/shops/{seller.profile.shop_slug}")
    for response in (profile, shop):
        assert response.status_code == 200
        assert response.json()["data"]["follower_count"] == 1
        assert response.json()["data"]["is_following"] is True
        assert "followers" not in response.json()["data"]


def test_approved_listings_consolidate_once_per_seller_and_day(
    client, db, factories, login_user
):
    admin = factories.user(role="admin")
    follower = factories.user()
    seller = factories.user()
    category = factories.category()
    login_user(follower)
    client.post(f"/api/v1/following/sellers/{seller.id}")

    first = factories.listing(seller, category, status="pending_review")
    second = factories.listing(seller, category, status="pending_review")
    service = ModerationService(db)
    service.approve_listing(first.id, admin)
    service.approve_listing(second.id, admin)

    notification = db.scalar(
        select(UserNotification).where(
            UserNotification.recipient_id == follower.id,
            UserNotification.type == "followed_seller_listing",
        )
    )
    assert notification
    assert notification.group_count == 2
    assert notification.entity_id == second.id
    assert (
        db.scalar(
            select(func.count(UserNotification.id)).where(
                UserNotification.recipient_id == follower.id,
                UserNotification.type == "followed_seller_listing",
            )
        )
        == 1
    )

    service.approve_listing(second.id, admin)
    db.refresh(notification)
    assert notification.group_count == 2

    feed = client.get("/api/v1/following/feed")
    assert feed.status_code == 200
    assert {item["id"] for item in feed.json()["data"]} == {first.id, second.id}


def test_feed_filters_status_expiry_suspension_and_supports_owned_cursor(
    client, db, factories, login_user
):
    follower = factories.user()
    other = factories.user()
    seller = factories.user()
    category = factories.category()
    FollowService(db).follow(follower, seller.id)
    FollowService(db).follow(other, seller.id)
    listings = [
        factories.listing(seller, category, title=f"Aktivan {index}")
        for index in range(3)
    ]
    for index, listing in enumerate(listings):
        listing.created_at = datetime.now(UTC) - timedelta(minutes=index)
    factories.listing(seller, category, status="sold")
    expired = factories.listing(seller, category)
    expired.expires_at = datetime.now(UTC) - timedelta(minutes=1)
    hidden_seller = factories.user()
    FollowService(db).follow(other, hidden_seller.id)
    hidden_listing = factories.listing(hidden_seller, category)
    db.commit()
    login_user(follower)

    first = client.get("/api/v1/following/feed", params={"limit": 2})
    assert first.status_code == 200
    assert len(first.json()["data"]) == 2
    cursor = first.json()["meta"]["next_cursor"]
    second = client.get(
        "/api/v1/following/feed",
        params={"limit": 2, "cursor": cursor},
    )
    assert len(second.json()["data"]) == 1
    assert {item["id"] for item in first.json()["data"]}.isdisjoint(
        {item["id"] for item in second.json()["data"]}
    )
    foreign_cursor = client.get(
        "/api/v1/following/feed",
        params={"cursor": hidden_listing.id},
    )
    assert foreign_cursor.status_code == 400

    seller.status = "suspended"
    db.commit()
    assert client.get("/api/v1/following/feed").json()["data"] == []
    public = client.get(f"/api/v1/users/profile/{seller.username}")
    assert public.status_code == 404


def test_block_removes_follow_and_prevents_feed_and_notifications(
    client, db, factories, login_user
):
    follower = factories.user()
    seller = factories.user()
    category = factories.category()
    listing = factories.listing(seller, category)
    FollowService(db).follow(follower, seller.id)
    db.add(UserBlock(blocker_id=seller.id, blocked_id=follower.id))
    db.commit()

    login_user(follower)
    assert client.get("/api/v1/following/feed").json()["data"] == []
    blocked_follow = client.post(f"/api/v1/following/sellers/{seller.id}")
    assert blocked_follow.status_code == 404
    assert FollowService(db).notify_listing_active(listing) == 0
    assert db.scalar(
        select(UserNotification.id).where(
            UserNotification.recipient_id == follower.id,
            UserNotification.type == "followed_seller_listing",
        )
    ) is None


def test_daily_digest_batches_activity_and_respects_preference(db, factories):
    follower = factories.user()
    opted_out = factories.user()
    seller = factories.user()
    category = factories.category()
    FollowService(db).follow(follower, seller.id)
    FollowService(db).follow(opted_out, seller.id)
    opted_out.profile.notify_followed_sellers = False
    for index in range(2):
        listing = factories.listing(seller, category, title=f"Novi {index}")
        listing.approved_at = datetime.now(UTC) - timedelta(minutes=index)
    db.commit()

    assert send_followed_seller_digests(db) == 1
    assert (
        db.scalar(
            select(func.count(EmailOutbox.id)).where(
                EmailOutbox.to_email == follower.email
            )
        )
        == 1
    )
    assert db.scalar(
        select(EmailOutbox.id).where(EmailOutbox.to_email == opted_out.email)
    ) is None
    assert send_followed_seller_digests(db) == 0


def test_following_feed_stays_within_constant_query_budget(db, factories):
    follower = factories.user()
    category = factories.category()
    for seller_index in range(5):
        seller = factories.user()
        FollowService(db).follow(follower, seller.id)
        for listing_index in range(4):
            factories.listing(
                seller,
                category,
                title=f"Prodavac {seller_index} oglas {listing_index}",
            )

    engine = db.get_bind()
    count = 0

    def count_query(*_args):
        nonlocal count
        count += 1

    event.listen(engine, "before_cursor_execute", count_query)
    try:
        rows, _ = FollowService(db).feed(follower.id, limit=20)
    finally:
        event.remove(engine, "before_cursor_execute", count_query)

    assert len(rows) == 20
    assert count <= FOLLOWING_FEED_QUERY_BUDGET
