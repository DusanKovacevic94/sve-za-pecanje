from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.listing import PUBLIC_LISTING_STATUSES, Listing
from app.core.storage import delete_storage_object
from app.services.listing_service import DRAFT_RETENTION_DAYS


def archive_expired_listings(db: Session, limit: int = 100) -> int:
    now = datetime.now(UTC)
    listings = db.scalars(
        select(Listing)
        .where(
            Listing.expires_at.is_not(None),
            Listing.expires_at < now,
            Listing.status.in_([*PUBLIC_LISTING_STATUSES, "pending_review"]),
        )
        .limit(limit)
    ).all()
    for listing in listings:
        listing.status = "archived"
        listing.reserved_at = None
        listing.reserved_by_user_id = None
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


def delete_stale_listing_drafts(db: Session, limit: int = 100) -> int:
    cutoff = datetime.now(UTC) - timedelta(days=DRAFT_RETENTION_DAYS)
    listings = db.scalars(
        select(Listing)
        .where(
            Listing.status == "draft",
            Listing.draft_last_saved_at.is_not(None),
            Listing.draft_last_saved_at < cutoff,
        )
        .limit(limit)
    ).all()
    storage_keys = [
        image.storage_key
        for listing in listings
        for image in listing.images
    ]
    for listing in listings:
        db.delete(listing)
    if listings:
        db.commit()
    for storage_key in storage_keys:
        delete_storage_object(storage_key)
    return len(listings)
