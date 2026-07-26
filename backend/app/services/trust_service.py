from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.listing import Listing
from app.models.review import Review
from app.models.user import User


def factual_trust_summaries(
    db: Session,
    users: list[User],
) -> dict[str, dict]:
    user_ids = {user.id for user in users}
    if not user_ids:
        return {}
    review_rows = db.execute(
        select(
            Review.reviewee_id,
            func.avg(Review.rating),
            func.count(Review.id),
        )
        .where(
            Review.reviewee_id.in_(user_ids),
            Review.status == "published",
        )
        .group_by(Review.reviewee_id)
    ).all()
    review_stats = {
        user_id: (round(float(rating), 1), int(count))
        for user_id, rating, count in review_rows
    }
    sale_rows = db.execute(
        select(Listing.seller_id, func.count(Listing.id))
        .where(
            Listing.seller_id.in_(user_ids),
            Listing.status == "sold",
        )
        .group_by(Listing.seller_id)
    ).all()
    sale_counts = {user_id: int(count) for user_id, count in sale_rows}
    return {
        user.id: {
            "email_verified": bool(user.email_verified_at),
            "phone_verified": bool(
                user.profile and user.profile.phone_verified_at
            ),
            "member_since": user.created_at,
            "review_count": review_stats.get(user.id, (None, 0))[1],
            "rating_average": review_stats.get(user.id, (None, 0))[0],
            "completed_sale_count": sale_counts.get(user.id, 0),
        }
        for user in users
    }


def factual_trust_summary(db: Session, user: User) -> dict:
    return factual_trust_summaries(db, [user])[user.id]
