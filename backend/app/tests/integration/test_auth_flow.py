from datetime import UTC, datetime, timedelta
import re

from sqlalchemy import select

from app.core.config import settings
from app.core.security import hash_password, hash_token
from app.models.email_outbox import EmailOutbox
from app.models.profile import UserProfile
from app.models.user import User


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def _token_from_latest_email(db) -> str:
    email = db.scalar(select(EmailOutbox).order_by(EmailOutbox.created_at.desc()))
    assert email
    match = re.search(r"token=([A-Za-z0-9_-]+)", email.body)
    assert match
    return match.group(1)


def test_register_verify_login_forgot_reset_flow(client, db):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "username": "test_user",
            "password": "StrongPassword123!",
            "accepted_terms": True,
        },
    )
    assert response.status_code == 200

    verify_response = client.post("/api/v1/auth/verify-email", json={"token": _token_from_latest_email(db)})
    assert verify_response.status_code == 200

    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "StrongPassword123!"},
    )
    assert login_response.status_code == 200

    forgot_response = client.post("/api/v1/auth/forgot-password", json={"email": "test@example.com"})
    assert forgot_response.status_code == 200

    reset_response = client.post(
        "/api/v1/auth/reset-password",
        json={"token": _token_from_latest_email(db), "new_password": "NewStrongPassword123!"},
    )
    assert reset_response.status_code == 200

    new_login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "NewStrongPassword123!"},
    )
    assert new_login_response.status_code == 200


def test_logout_revokes_session(client):
    register_response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "logout@example.com",
            "username": "logout_user",
            "password": "StrongPassword123!",
            "accepted_terms": True,
        },
    )
    assert register_response.status_code == 200
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "logout@example.com", "password": "StrongPassword123!"},
    )
    assert login_response.status_code == 200
    old_token = client.cookies.get(settings.session_cookie_name)
    assert old_token
    assert client.get("/api/v1/auth/me").status_code == 200
    assert client.post("/api/v1/auth/logout").status_code == 200
    assert client.get("/api/v1/auth/me").status_code == 401
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {old_token}"}).status_code == 401


def test_expired_reset_token_is_rejected(client, db):
    user = User(
        email="expired@example.com",
        username="expired_user",
        password_hash=hash_password("StrongPassword123!"),
        status="active",
        email_verified_at=datetime.now(UTC),
        password_reset_token_hash=hash_token("expired-token"),
        password_reset_expires_at=datetime.now(UTC) - timedelta(minutes=1),
    )
    user.profile = UserProfile(display_name="expired_user")
    db.add(user)
    db.commit()

    response = client.post(
        "/api/v1/auth/reset-password",
        json={"token": "expired-token", "new_password": "NewStrongPassword123!"},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "TOKEN_EXPIRED"
