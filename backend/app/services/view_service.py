from datetime import UTC, datetime, timedelta
from hashlib import sha256
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.listing import Listing

_dedupe: dict[str, datetime] = {}
_redis_client: Any | None = None
_redis_failed_at: datetime | None = None
_REDIS_RETRY_AFTER = timedelta(seconds=30)

BOT_MARKERS = (
    "bot",
    "crawler",
    "spider",
    "slurp",
    "bingpreview",
    "facebookexternalhit",
    "whatsapp",
    "telegrambot",
    "linkedinbot",
)


def is_bot_user_agent(user_agent: str | None) -> bool:
    value = (user_agent or "").lower()
    return any(marker in value for marker in BOT_MARKERS)


def _get_redis_client(now: datetime):
    global _redis_client, _redis_failed_at
    if _redis_failed_at and now - _redis_failed_at < _REDIS_RETRY_AFTER:
        return None
    if _redis_client is not None:
        return _redis_client
    try:
        import redis

        _redis_client = redis.Redis.from_url(settings.redis_url, socket_connect_timeout=0.5, socket_timeout=0.5)
        _redis_client.ping()
    except Exception:
        _redis_client = None
        _redis_failed_at = now
        return None
    _redis_failed_at = None
    return _redis_client


def _viewer_key(listing_id: str, user_id: str | None, ip: str, user_agent: str | None) -> str:
    identity = user_id or ip
    digest = sha256(f"{listing_id}:{identity}:{user_agent or ''}".encode()).hexdigest()
    return f"listing-view:{digest}"


def _fallback_track(db: Session, listing_id: str, dedupe_key: str, now: datetime) -> bool:
    stale = [key for key, expires_at in _dedupe.items() if expires_at < now]
    for key in stale:
        del _dedupe[key]
    if _dedupe.get(dedupe_key, datetime.min.replace(tzinfo=UTC)) > now:
        return False
    _dedupe[dedupe_key] = now + timedelta(seconds=settings.view_dedupe_seconds)
    listing = db.scalar(select(Listing).where(Listing.id == listing_id))
    if not listing:
        return False
    listing.view_count += 1
    db.commit()
    return True


def track_listing_view(
    db: Session,
    listing_id: str,
    ip: str,
    user_agent: str | None,
    user_id: str | None = None,
) -> bool:
    if is_bot_user_agent(user_agent):
        return False
    now = datetime.now(UTC)
    dedupe_key = _viewer_key(listing_id, user_id, ip, user_agent)
    client = _get_redis_client(now)
    if client is None:
        return _fallback_track(db, listing_id, dedupe_key, now)
    try:
        inserted = client.set(dedupe_key, "1", nx=True, ex=settings.view_dedupe_seconds)
        if not inserted:
            return False
        client.incr(f"listing-view-count:{listing_id}")
        return True
    except Exception:
        return _fallback_track(db, listing_id, dedupe_key, now)


def flush_view_counts(db: Session, limit: int = 500) -> int:
    now = datetime.now(UTC)
    client = _get_redis_client(now)
    if client is None:
        return 0
    updated = 0
    try:
        keys = list(client.scan_iter("listing-view-count:*", count=limit))
        for raw_key in keys[:limit]:
            key = raw_key.decode() if isinstance(raw_key, bytes) else raw_key
            listing_id = key.rsplit(":", 1)[-1]
            value = int(client.getdel(key) or 0)
            if value <= 0:
                continue
            listing = db.get(Listing, listing_id)
            if listing:
                listing.view_count += value
                updated += 1
        if updated:
            db.commit()
    except Exception:
        db.rollback()
        return 0
    return updated
