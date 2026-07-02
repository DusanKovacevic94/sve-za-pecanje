from collections import defaultdict
from datetime import UTC, datetime, timedelta

from fastapi import Request

from app.core.config import settings
from app.core.responses import api_error

_buckets: dict[str, list[datetime]] = defaultdict(list)
_calls_since_sweep = 0
_SWEEP_EVERY = 1000
_MAX_IDLE = timedelta(hours=1)


def _sweep(now: datetime) -> None:
    stale = [key for key, stamps in _buckets.items() if not stamps or stamps[-1] < now - _MAX_IDLE]
    for key in stale:
        del _buckets[key]


def check_rate_limit(request: Request, key: str, limit: int, window_seconds: int) -> None:
    global _calls_since_sweep
    if not settings.rate_limit_enabled:
        return
    ip = request.client.host if request.client else "unknown"
    bucket_key = f"{key}:{ip}"
    now = datetime.now(UTC)
    _calls_since_sweep += 1
    if _calls_since_sweep >= _SWEEP_EVERY:
        _calls_since_sweep = 0
        _sweep(now)
    cutoff = now - timedelta(seconds=window_seconds)
    _buckets[bucket_key] = [stamp for stamp in _buckets[bucket_key] if stamp > cutoff]
    if len(_buckets[bucket_key]) >= limit:
        raise api_error("RATE_LIMITED", "Previše pokušaja. Pokušajte kasnije.", 429)
    _buckets[bucket_key].append(now)

