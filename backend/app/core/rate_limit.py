from collections import defaultdict
from datetime import UTC, datetime, timedelta

from fastapi import Request

from app.core.responses import api_error

_buckets: dict[str, list[datetime]] = defaultdict(list)


def check_rate_limit(request: Request, key: str, limit: int, window_seconds: int) -> None:
    ip = request.client.host if request.client else "unknown"
    bucket_key = f"{key}:{ip}"
    now = datetime.now(UTC)
    cutoff = now - timedelta(seconds=window_seconds)
    _buckets[bucket_key] = [stamp for stamp in _buckets[bucket_key] if stamp > cutoff]
    if len(_buckets[bucket_key]) >= limit:
        raise api_error("RATE_LIMITED", "Previše pokušaja. Pokušajte kasnije.", 429)
    _buckets[bucket_key].append(now)

