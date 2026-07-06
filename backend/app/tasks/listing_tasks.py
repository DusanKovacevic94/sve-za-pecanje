from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.listing import Listing


def archive_expired_listings(db: Session, limit: int = 100) -> int:
    now = datetime.now(UTC)
    listings = db.scalars(
        select(Listing)
        .where(Listing.expires_at.is_not(None), Listing.expires_at < now, Listing.status.in_(["active", "pending_review"]))
        .limit(limit)
    ).all()
    for listing in listings:
        listing.status = "archived"
    if listings:
        db.commit()
    return len(listings)


def clear_expired_featured_listings(db: Session, limit: int = 100) -> int:
    now = datetime.now(UTC)
    listings = db.scalars(
        select(Listing)
        .where(Listing.is_featured.is_(True), Listing.featured_until.is_not(None), Listing.featured_until < now)
        .limit(limit)
    ).all()
    for listing in listings:
        listing.is_featured = False
        listing.featured_until = None
    if listings:
        db.commit()
    return len(listings)
