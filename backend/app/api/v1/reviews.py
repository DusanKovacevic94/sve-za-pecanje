from fastapi import APIRouter, Depends
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user
from app.core.responses import api_error, data_response
from app.db.session import get_db
from app.models.listing import Listing
from app.models.review import Review
from app.models.user import User
from app.schemas.review import ReviewCreate
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.post("")
def create_review(
    payload: ReviewCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    listing = db.get(Listing, payload.listing_id)
    if not listing or listing.status != "sold":
        raise api_error("VALIDATION_ERROR", "Ocenu možete ostaviti tek nakon prodaje.", 400)
    allowed_users = {listing.seller_id, listing.sold_to_user_id}
    if user.id not in allowed_users or payload.reviewee_id not in allowed_users:
        raise api_error("FORBIDDEN", "Nemate dozvolu za ovu ocenu.", 403)
    if payload.reviewee_id == user.id:
        raise api_error("VALIDATION_ERROR", "Ne možete oceniti sami sebe.", 400)
    review = Review(
        listing_id=payload.listing_id,
        reviewer_id=user.id,
        reviewee_id=payload.reviewee_id,
        rating=payload.rating,
        comment=payload.comment,
    )
    db.add(review)
    try:
        db.flush()
        NotificationService(db).create(
            recipient_id=review.reviewee_id,
            type_="review_received",
            deduplication_key=f"review-received:{review.id}",
            actor_id=user.id,
            entity_type="review",
            entity_id=review.id,
            payload={
                "title": "Dobili ste novu ocenu",
                "body": f"{user.username} vam je ostavio/la ocenu.",
            },
            event_id=f"review:{review.id}",
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise api_error("CONFLICT", "Već ste ostavili ocenu za ovaj oglas.", 409) from None
    db.refresh(review)
    return data_response(
        {
            "id": review.id,
            "listing_id": review.listing_id,
            "reviewer_id": review.reviewer_id,
            "reviewee_id": review.reviewee_id,
            "rating": review.rating,
            "comment": review.comment,
            "status": review.status,
            "created_at": review.created_at,
        }
    )
