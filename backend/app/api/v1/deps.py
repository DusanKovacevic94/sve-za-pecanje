from datetime import UTC, datetime

from fastapi import Cookie, Depends, Header
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.responses import api_error
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.auth_session import AuthSession
from app.models.user import User


def _as_utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=UTC)


def get_optional_user(
    db: Session = Depends(get_db),
    authorization: str | None = Header(default=None),
    session_cookie: str | None = Cookie(default=None, alias=settings.session_cookie_name),
) -> User | None:
    token = session_cookie
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1]
    if not token:
        return None
    payload = decode_access_token(token)
    if not payload:
        return None
    session_id = payload.get("sid")
    if not session_id:
        return None
    session = db.get(AuthSession, session_id)
    if (
        not session
        or session.revoked_at
        or _as_utc(session.expires_at) < datetime.now(UTC)
        or session.user_id != payload.get("sub")
    ):
        return None
    session.last_seen_at = datetime.now(UTC)
    db.commit()
    user = db.get(User, payload.get("sub"))
    if not user or user.status in {"suspended", "deleted"}:
        return None
    return user


def get_current_user(user: User | None = Depends(get_optional_user)) -> User:
    if not user:
        raise api_error("UNAUTHORIZED", "Prijava je obavezna.", 401)
    return user


def get_current_auth_session(
    db: Session = Depends(get_db),
    authorization: str | None = Header(default=None),
    session_cookie: str | None = Cookie(
        default=None, alias=settings.session_cookie_name
    ),
) -> AuthSession:
    token = session_cookie
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1]
    payload = decode_access_token(token) if token else None
    session = db.get(AuthSession, payload.get("sid")) if payload and payload.get("sid") else None
    if (
        not session
        or session.revoked_at
        or _as_utc(session.expires_at) < datetime.now(UTC)
        or session.user_id != payload.get("sub")
    ):
        raise api_error("UNAUTHORIZED", "Prijava je obavezna.", 401)
    return session
