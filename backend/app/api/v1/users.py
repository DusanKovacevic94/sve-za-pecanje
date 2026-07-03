from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.api.v1.deps import get_current_user
from app.core.responses import api_error, data_response
from app.db.session import get_db
from app.models.favorite import Favorite
from app.models.listing import Listing
from app.models.review import Review
from app.models.user import User
from app.schemas.user import ProfileUpdate
from app.services.listing_service import serialize_listing_card

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/profile/{username}")
def public_profile(username: str, db: Session = Depends(get_db)):
    user = db.scalar(select(User).options(selectinload(User.profile)).where(User.username == username))
    if not user or user.status == "suspended":
        raise api_error("NOT_FOUND", "Prodavac nije pronađen.", 404)
    listings = db.scalars(
        select(Listing)
        .options(
            selectinload(Listing.seller).selectinload(User.profile),
            selectinload(Listing.category),
            selectinload(Listing.brand),
            selectinload(Listing.images),
        )
        .where(Listing.seller_id == user.id, Listing.status == "active")
        .order_by(Listing.created_at.desc())
    ).all()
    rating = db.scalar(select(func.avg(Review.rating)).where(Review.reviewee_id == user.id))
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
            "rating": float(rating) if rating else None,
            "active_listings_count": len(listings),
            "listings": [serialize_listing_card(listing) for listing in listings],
        }
    )


@router.get("/me/listings")
def my_listings(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    listings = db.scalars(
        select(Listing)
        .options(
            selectinload(Listing.seller).selectinload(User.profile),
            selectinload(Listing.category),
            selectinload(Listing.brand),
            selectinload(Listing.images),
        )
        .where(Listing.seller_id == user.id, Listing.status != "deleted")
        .order_by(Listing.created_at.desc())
    ).all()
    return data_response([serialize_listing_card(listing) for listing in listings])


@router.get("/me/favorites")
def my_favorites(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    listings = db.scalars(
        select(Listing)
        .join(Favorite, Favorite.listing_id == Listing.id)
        .options(
            selectinload(Listing.seller).selectinload(User.profile),
            selectinload(Listing.category),
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
        raise api_error("NOT_FOUND", "Profil nije pronađen.", 404)
    data = payload.model_dump(exclude_unset=True)
    phone_number = data.pop("phone_number", None)
    if phone_number:
        user.profile.phone_number_encrypted = phone_number
    for key, value in data.items():
        setattr(user.profile, key, value)
    db.commit()
    db.refresh(user.profile)
    return data_response({"message": "Profil je ažuriran."})
