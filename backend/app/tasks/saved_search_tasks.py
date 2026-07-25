from datetime import UTC, datetime
from hashlib import sha256

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.email import enqueue_email
from app.models.saved_search import SavedSearch
from app.models.user import User
from app.services.search_service import SearchService
from app.services.notification_service import NotificationService


def send_saved_search_digests(db: Session, limit: int = 50) -> int:
    now = datetime.now(UTC)
    rows = db.execute(
        select(SavedSearch, User)
        .join(User, User.id == SavedSearch.user_id)
        .options(selectinload(User.profile))
        .where(SavedSearch.notification_enabled.is_(True), User.status != "suspended")
        .order_by(SavedSearch.updated_at.asc())
        .limit(limit)
    ).all()
    search_service = SearchService(db)
    sent = 0
    for saved_search, user in rows:
        watermark = saved_search.last_notified_at or saved_search.created_at
        listings = search_service.matching_listings(saved_search.query, saved_search.filters, since=watermark, limit=10)
        saved_search.last_notified_at = now
        if not listings:
            continue
        NotificationService(db).create(
            recipient_id=user.id,
            type_="saved_search_matches",
            deduplication_key=f"saved-search-matches:{saved_search.id}",
            entity_type="saved_search",
            entity_id=saved_search.id,
            payload={
                "title": f'Novi oglasi: „{saved_search.name}”',
                "body": (
                    f"{len(listings)} novih oglasa odgovara sačuvanoj pretrazi."
                ),
            },
            event_id=(
                "saved-search:"
                + sha256(
                    ":".join(sorted(item.id for item in listings)).encode()
                ).hexdigest()
            ),
            consolidate=True,
        )
        if NotificationService.can_send_saved_search_email(user):
            lines = [f"- {listing.title} ({listing.city})" for listing in listings]
            body = (
                f"Pronašli smo nove oglase za sačuvanu pretragu "
                f'"{saved_search.name}":\n\n'
                + "\n".join(lines)
                + "\n\nOtvorite Sve Za Pecanje da ih pogledate."
            )
            enqueue_email(
                db,
                user.email,
                f'Novi oglasi za "{saved_search.name}"',
                body,
            )
            sent += 1
    if rows:
        db.commit()
    return sent
