from __future__ import annotations

from uuid import uuid4

import httpx

from app.core.config import settings
from app.core.responses import api_error

SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


def verify_turnstile_token(token: str | None, remote_ip: str | None = None) -> None:
    """Validate a required challenge. Disabled configuration is an explicit bypass."""
    if not settings.turnstile_enabled:
        return
    if not settings.turnstile_secret_key:
        raise api_error(
            "challenge_unavailable",
            "Bezbednosna provera trenutno nije dostupna. Pokušajte ponovo.",
            503,
        )
    if not token or len(token) > 2048:
        raise api_error(
            "challenge_required",
            "Potvrdite bezbednosnu proveru i pokušajte ponovo.",
            403,
        )

    payload = {
        "secret": settings.turnstile_secret_key,
        "response": token,
        "idempotency_key": str(uuid4()),
    }
    if remote_ip:
        payload["remoteip"] = remote_ip
    try:
        response = httpx.post(
            SITEVERIFY_URL,
            data=payload,
            timeout=settings.turnstile_timeout_seconds,
        )
        response.raise_for_status()
        result = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise api_error(
            "challenge_unavailable",
            "Bezbednosna provera trenutno nije dostupna. Pokušajte ponovo.",
            503,
        ) from exc

    error_codes = set(result.get("error-codes") or [])
    if result.get("success") is True:
        return
    if "internal-error" in error_codes:
        raise api_error(
            "challenge_unavailable",
            "Bezbednosna provera trenutno nije dostupna. Pokušajte ponovo.",
            503,
        )
    raise api_error(
        "challenge_required",
        "Provera je istekla ili nije uspela. Pokušajte ponovo.",
        403,
        {"retry_challenge": True},
    )
