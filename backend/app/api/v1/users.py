from fastapi import APIRouter, Depends
from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.api.v1.deps import get_current_user
from app.core.responses import api_error, data_response
from app.db.session import get_db
from app.models.category import Category
from app.models.favorite import Favorite
from app.models.listing import Listing
from app.models.message import Conversation
from app.models.profile import UserProfile
from app.models.review import Review
from app.models.user import User
from app.schemas.user import ProfileUpdate
from app.services.listing_service import serialize_listing_card
from app.services.shop_service import ShopService, serialize_shop_profile

router = APIRouter(prefix="/users", tags=["users"])


def serialize_profile(user: User) -> dict:
    profile = user.profile
    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "display_name": profile.display_name if profile else None,
        "city": profile.city if profile else None,
        "municipality": profile.municipality if profile else None,
        "phone_number": profile.phone_number if profile else None,
        "phone_visible": profile.phone_visible if profile else False,
        "bio": profile.bio if profile else None,
        "fishing_styles": profile.fishing_styles if profile else [],
        "member_badges": profile.member_badges if profile else [],
        **serialize_shop_profile(profile),
        "notify_messages": profile.notify_messages if profile else True,
        "notify_saved_searches": profile.notify_saved_searches if profile else True,
        "notify_listing_expiry": profile.notify_listing_expiry if profile else True,
        "created_at": user.created_at,
    }


def serialize_review(review: Review, listing: Listing | None, reviewer: User | None, reviewee: User | None) -> dict:
    return {
        "id": review.id,
        "listing_id": review.listing_id,
        "listing": (
            {"id": listing.id, "title": listing.title, "slug": listing.slug}
            if listing
            else None
        ),
        "reviewer": (
            {
                "id": reviewer.id,
                "username": reviewer.username,
                "display_name": reviewer.profile.display_name if reviewer.profile else None,
            }
            if reviewer
            else None
        ),
        "reviewee": (
            {
                "id": reviewee.id,
                "username": reviewee.username,
                "display_name": reviewee.profile.display_name if reviewee.profile else None,
            }
            if reviewee
            else None
        ),
        "rating": review.rating,
        "comment": review.comment,
        "status": review.status,
        "created_at": review.created_at,
    }


def list_reviews(db: Session, *filters) -> list[dict]:
    reviews = db.scalars(select(Review).where(*filters).order_by(Review.created_at.desc())).all()
    if not reviews:
        return []
    listing_ids = {review.listing_id for review in reviews}
    user_ids = {review.reviewer_id for review in reviews} | {review.reviewee_id for review in reviews}
    listings = {
        listing.id: listing
        for listing in db.scalars(select(Listing).where(Listing.id.in_(listing_ids))).all()
    }
    users = {
        item.id: item
        for item in db.scalars(
            select(User).options(selectinload(User.profile)).where(User.id.in_(user_ids))
        ).all()
    }
    return [
        serialize_review(review, listings.get(review.listing_id), users.get(review.reviewer_id), users.get(review.reviewee_id))
        for review in reviews
    ]


@router.get("/profile/{username}")
def public_profile(username: str, db: Session = Depends(get_db)):
    user = db.scalar(select(User).options(selectinload(User.profile)).where(User.username == username))
    if not user or user.status == "suspended":
        raise api_error("NOT_FOUND", "Prodavac nije pronađen.", 404)
    listings = db.scalars(
        select(Listing)
        .options(
            selectinload(Listing.seller).selectinload(User.profile),
            selectinload(Listing.category).selectinload(Category.attributes),
            selectinload(Listing.brand),
            selectinload(Listing.images),
        )
        .where(Listing.seller_id == user.id, Listing.status == "active")
        .order_by(Listing.created_at.desc())
    ).all()
    rating = db.scalar(select(func.avg(Review.rating)).where(Review.reviewee_id == user.id))
    reviews = list_reviews(db, Review.reviewee_id == user.id, Review.status == "published")
    return data_response(
        {
            "id": user.id,
            "username": user.username,
            "display_name": user.profile.display_name if user.profile else None,
            "city": user.profile.city if user.profile else None,
            "bio": user.profile.bio if user.profile else None,
            "fishing_styles": user.profile.fishing_styles if user.profile else [],
            "member_since": user.created_at,
            "phone_visible": user.profile.phone_visible if user.profile else False,
            "shop": serialize_shop_profile(user.profile),
            "rating": float(rating) if rating else None,
            "reviews": reviews,
            "active_listings_count": len(listings),
            "listings": [serialize_listing_card(listing) for listing in listings],
        }
    )


@router.get("/me/profile")
def my_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    loaded_user = db.scalar(select(User).options(selectinload(User.profile)).where(User.id == user.id))
    return data_response(serialize_profile(loaded_user or user))


@router.get("/me/listings")
def my_listings(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    listings = db.scalars(
        select(Listing)
        .options(
            selectinload(Listing.seller).selectinload(User.profile),
            selectinload(Listing.category).selectinload(Category.attributes),
            selectinload(Listing.brand),
            selectinload(Listing.images),
        )
        .where(Listing.seller_id == user.id, Listing.status != "deleted")
        .order_by(Listing.created_at.desc())
    ).all()
    conversation_counts = dict(
        db.execute(
            select(Conversation.listing_id, func.count(Conversation.id))
            .where(Conversation.seller_id == user.id)
            .group_by(Conversation.listing_id)
        ).all()
    )
    data = []
    for listing in listings:
        item = serialize_listing_card(listing)
        item["message_count"] = int(conversation_counts.get(listing.id, 0))
        data.append(item)
    return data_response(data)


@router.get("/me/unread-count")
def my_unread_count(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    unread_count = db.scalar(
        select(
            func.coalesce(
                func.sum(
                    case(
                        (Conversation.buyer_id == user.id, Conversation.buyer_unread_count),
                        (Conversation.seller_id == user.id, Conversation.seller_unread_count),
                        else_=0,
                    )
                ),
                0,
            )
        ).where((Conversation.buyer_id == user.id) | (Conversation.seller_id == user.id))
    )
    return data_response({"unread_count": int(unread_count or 0)})


@router.get("/me/reviews")
def my_reviews(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    received = list_reviews(db, Review.reviewee_id == user.id, Review.status == "published")
    given = list_reviews(db, Review.reviewer_id == user.id, Review.status == "published")
    reviewed_pairs = {
        (review.listing_id, review.reviewee_id)
        for review in db.scalars(select(Review).where(Review.reviewer_id == user.id)).all()
    }
    sold_listings = db.scalars(
        select(Listing)
        .options(selectinload(Listing.seller).selectinload(User.profile))
        .where(
            Listing.status == "sold",
            Listing.sold_to_user_id.is_not(None),
            or_(Listing.seller_id == user.id, Listing.sold_to_user_id == user.id),
        )
        .order_by(Listing.sold_at.desc().nullslast())
    ).all()
    buyer_ids = {listing.sold_to_user_id for listing in sold_listings if listing.sold_to_user_id}
    buyers = {
        buyer.id: buyer
        for buyer in db.scalars(select(User).options(selectinload(User.profile)).where(User.id.in_(buyer_ids))).all()
    }
    pending = []
    for listing in sold_listings:
        reviewee_id = listing.sold_to_user_id if user.id == listing.seller_id else listing.seller_id
        if not reviewee_id or (listing.id, reviewee_id) in reviewed_pairs:
            continue
        reviewee = listing.seller if reviewee_id == listing.seller_id else buyers.get(reviewee_id)
        if not reviewee:
            continue
        pending.append(
            {
                "listing": {"id": listing.id, "title": listing.title, "slug": listing.slug},
                "reviewee": {
                    "id": reviewee_id,
                    "username": reviewee.username,
                    "display_name": reviewee.profile.display_name if reviewee.profile else None,
                },
            }
        )
    return data_response({"received": received, "given": given, "pending": pending})


@router.get("/me/favorites")
def my_favorites(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    listings = db.scalars(
        select(Listing)
        .join(Favorite, Favorite.listing_id == Listing.id)
        .options(
            selectinload(Listing.seller).selectinload(User.profile),
            selectinload(Listing.category).selectinload(Category.attributes),
            selectinload(Listing.brand),
            selectinload(Listing.images),
        )
        .where(Favorite.user_id == user.id, Listing.status != "deleted")
        .order_by(Favorite.created_at.desc())
    ).all()
    return data_response([serialize_listing_card(listing) for listing in listings])


@router.patch("/me/profile")
def update_profile(
    payload: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not user.profile:
        user.profile = UserProfile(display_name=user.username)
    data = payload.model_dump(exclude_unset=True)
    phone_number = data.pop("phone_number", None)
    if phone_number:
        user.profile.phone_number = phone_number
    for key, value in data.items():
        setattr(user.profile, key, value)
    db.commit()
    db.refresh(user.profile)
    db.refresh(user)
    return data_response(serialize_profile(user))
