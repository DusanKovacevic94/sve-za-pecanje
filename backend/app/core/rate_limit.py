from collections import defaultdict
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import Request

from app.core.config import settings
from app.core.responses import api_error

_buckets: dict[str, list[datetime]] = defaultdict(list)
_calls_since_sweep = 0
_SWEEP_EVERY = 1000
_MAX_IDLE = timedelta(hours=1)
_redis_client: Any | None = None
_redis_failed_at: datetime | None = None
_REDIS_RETRY_AFTER = timedelta(seconds=30)


def _sweep(now: datetime) -> None:
    stale = [key for key, stamps in _buckets.items() if not stamps or stamps[-1] < now - _MAX_IDLE]
    for key in stale:
        del _buckets[key]


def _fallback_check(bucket_key: str, limit: int, window_seconds: int, now: datetime) -> None:
    global _calls_since_sweep
    _calls_since_sweep += 1
    if _calls_since_sweep >= _SWEEP_EVERY:
        _calls_since_sweep = 0
        _sweep(now)
    cutoff = now - timedelta(seconds=window_seconds)
    _buckets[bucket_key] = [stamp for stamp in _buckets[bucket_key] if stamp > cutoff]
    if len(_buckets[bucket_key]) >= limit:
        raise api_error("RATE_LIMITED", "Previše pokušaja. Pokušajte kasnije.", 429)
    _buckets[bucket_key].append(now)


def _get_redis_client(now: datetime) -> Any | None:
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
        _redis_failed_at = now
        _redis_client = None
        return None
    _redis_failed_at = None
    return _redis_client


def _redis_check(bucket_key: str, limit: int, window_seconds: int, now: datetime) -> bool:
    global _redis_client, _redis_failed_at
    client = _get_redis_client(now)
    if client is None:
        return False
    window_index = int(now.timestamp()) // window_seconds
    redis_key = f"rate-limit:{bucket_key}:{window_index}"
    try:
        count = int(client.incr(redis_key))
        if count == 1:
            client.expire(redis_key, window_seconds + 5)
    except Exception:
        _redis_failed_at = now
        _redis_client = None
        return False
    if count > limit:
        raise api_error("RATE_LIMITED", "Previše pokušaja. Pokušajte kasnije.", 429)
    return True


def check_rate_limit(request: Request, key: str, limit: int, window_seconds: int) -> None:
    if not settings.rate_limit_enabled:
        return
    ip = request.client.host if request.client else "unknown"
    bucket_key = f"{key}:{ip}"
    now = datetime.now(UTC)
    if _redis_check(bucket_key, limit, window_seconds, now):
        return
    _fallback_check(bucket_key, limit, window_seconds, now)
