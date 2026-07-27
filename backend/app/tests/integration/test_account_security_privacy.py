import io
import json
import re
import zipfile
from datetime import UTC, datetime, timedelta
from urllib.parse import parse_qs, urlparse

from sqlalchemy import select

from app.core.config import Settings, settings
from app.models.account_privacy import AccountClosure, DataExportRequest
from app.models.audit import AuditLog
from app.models.auth_session import AuthSession
from app.models.email_outbox import EmailOutbox
from app.models.favorite import Favorite
from app.models.saved_search import SavedSearch
from app.services.account_service import (
    cleanup_expired_exports,
    finalize_account_closures,
    process_data_exports,
)
from app.services.message_service import MessageService


def _login_token(client, user, user_agent: str) -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "password": "StrongPassword123!"},
        headers={"user-agent": user_agent},
    )
    assert response.status_code == 200
    return client.cookies.get(settings.session_cookie_name)


def _authorization(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _export_token(db, recipient: str) -> str:
    email = db.scalar(
        select(EmailOutbox)
        .where(
            EmailOutbox.to_email == recipient,
            EmailOutbox.subject.contains("izvoz podataka"),
        )
        .order_by(EmailOutbox.created_at.desc())
    )
    assert email
    url = re.search(r"https?://\S+", email.body).group(0)
    return parse_qs(urlparse(url).query)["token"][0]


def test_session_inventory_revoke_and_security_audit(client, db, factories):
    user = factories.user()
    first_token = _login_token(
        client,
        user,
        "Mozilla/5.0 Firefox/128.0",
    )
    second_token = _login_token(
        client,
        user,
        "Mozilla/5.0 (iPhone) Version/18.0 Mobile Safari/605.1",
    )

    sessions = client.get(
        "/api/v1/account/sessions",
        headers=_authorization(second_token),
    )
    assert sessions.status_code == 200
    rows = sessions.json()["data"]
    assert len(rows) == 2
    current = next(item for item in rows if item["is_current"])
    other = next(item for item in rows if not item["is_current"])
    assert "Safari" in current["device"]
    assert "mobilni" in current["device"]
    assert "Firefox" in other["device"]

    revoked = client.delete(
        f"/api/v1/account/sessions/{other['id']}",
        headers=_authorization(second_token),
    )
    assert revoked.status_code == 200
    assert client.get(
        "/api/v1/auth/me", headers=_authorization(first_token)
    ).status_code == 401
    assert client.get(
        "/api/v1/auth/me", headers=_authorization(second_token)
    ).status_code == 200

    third_token = _login_token(client, user, "Chrome/130.0")
    all_others = client.post(
        "/api/v1/account/sessions/revoke-others",
        headers=_authorization(third_token),
    )
    assert all_others.status_code == 200
    assert all_others.json()["data"]["revoked_count"] == 1
    assert client.get(
        "/api/v1/auth/me", headers=_authorization(second_token)
    ).status_code == 401
    assert db.scalar(
        select(AuditLog).where(AuditLog.action == "account.other_sessions_revoked")
    )
    assert db.scalar(
        select(EmailOutbox).where(
            EmailOutbox.to_email == user.email,
            EmailOutbox.subject.contains("Druge sesije"),
        )
    )


def test_export_is_private_single_use_and_cooldown_is_enforced(
    client, db, factories, login_user, monkeypatch, tmp_path
):
    monkeypatch.setattr(settings, "local_storage_path", str(tmp_path / "storage"))
    seller = factories.user(email="private-seller@example.com")
    user = factories.user()
    listing = factories.listing(seller, factories.category())
    db.add(Favorite(user_id=user.id, listing_id=listing.id))
    db.add(
        SavedSearch(
            user_id=user.id,
            name="Moja pretraga",
            query="feeder",
            filters={"city": "Beograd"},
            notification_enabled=True,
        )
    )
    db.commit()
    MessageService(db).send_for_listing(listing.id, user, "Moja autorska poruka")
    login_user(user)

    requested = client.post("/api/v1/account/exports")
    assert requested.status_code == 200
    duplicate = client.post("/api/v1/account/exports")
    assert duplicate.status_code == 429
    assert duplicate.json()["error"]["code"] == "EXPORT_COOLDOWN"

    assert process_data_exports(db) == 1
    export = db.get(DataExportRequest, requested.json()["data"]["id"])
    db.refresh(export)
    assert export.status == "ready"
    assert export.expires_at
    assert export.storage_key
    encrypted_bytes = open(export.storage_key, "rb").read()
    assert b"private-seller@example.com" not in encrypted_bytes
    token = _export_token(db, user.email)

    downloaded = client.get(
        "/api/v1/account/exports/download",
        params={"token": token},
    )
    assert downloaded.status_code == 200
    assert downloaded.headers["content-type"] == "application/zip"
    with zipfile.ZipFile(io.BytesIO(downloaded.content)) as archive:
        payload = json.loads(archive.read("sve-za-pecanje-export.json"))
    assert payload["account"]["email"] == user.email
    assert payload["authored_messages"][0]["body"] == "Moja autorska poruka"
    assert payload["favorites"][0]["listing_id"] == listing.id
    assert payload["saved_searches"][0]["name"] == "Moja pretraga"
    serialized = json.dumps(payload)
    assert "private-seller@example.com" not in serialized
    assert "password_hash" not in serialized
    assert "token" not in serialized.lower()

    second_use = client.get(
        "/api/v1/account/exports/download",
        params={"token": token},
    )
    assert second_use.status_code == 410
    db.refresh(export)
    assert export.status == "downloaded"
    assert export.storage_key is None


def test_export_expiry_cleanup_and_worker_retry(
    client, db, factories, login_user, monkeypatch, tmp_path
):
    monkeypatch.setattr(settings, "local_storage_path", str(tmp_path / "storage"))
    user = factories.user()
    login_user(user)
    request = client.post("/api/v1/account/exports")
    assert process_data_exports(db) == 1
    item = db.get(DataExportRequest, request.json()["data"]["id"])
    item.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    storage_key = item.storage_key
    db.commit()
    assert cleanup_expired_exports(db) == 1
    db.refresh(item)
    assert item.status == "expired"
    assert not storage_key or not __import__("pathlib").Path(storage_key).exists()

    other = factories.user()
    login_user(other)
    failed_request = client.post("/api/v1/account/exports")
    failed = db.get(DataExportRequest, failed_request.json()["data"]["id"])
    monkeypatch.setattr(
        "app.services.account_service.store_private_export",
        lambda *args: (_ for _ in ()).throw(OSError("storage unavailable")),
    )
    assert process_data_exports(db) == 1
    assert process_data_exports(db) == 1
    assert process_data_exports(db) == 1
    db.refresh(failed)
    assert failed.status == "failed"
    assert failed.attempts == 3


def test_closure_revokes_hides_restores_and_finally_anonymizes(
    client, db, factories, login_user, monkeypatch
):
    monkeypatch.setattr(settings, "account_closure_enabled", True)
    seller = factories.user()
    buyer = factories.user()
    listing = factories.listing(seller, factories.category())
    seller.profile.shop_name = "Test prodavnica"
    seller.profile.shop_slug = f"shop-{seller.username}"
    seller.profile.shop_active_until = datetime.now(UTC) + timedelta(days=30)
    search = SavedSearch(
        user_id=seller.id,
        name="Aktivna pretraga",
        filters={},
        notification_enabled=True,
    )
    db.add(search)
    db.commit()
    conversation = MessageService(db).send_for_listing(
        listing.id, buyer, "Poruka koja mora ostati sačuvana"
    )

    login_user(seller)
    token = client.cookies.get(settings.session_cookie_name)
    closed = client.post(
        "/api/v1/account/closure",
        json={"confirmation": "OBRIŠI"},
    )
    assert closed.status_code == 200
    assert client.get(
        "/api/v1/auth/me", headers=_authorization(token)
    ).status_code == 401
    db.refresh(seller)
    db.refresh(listing)
    db.refresh(search)
    assert seller.status == "pending_deletion"
    assert listing.status == "archived"
    assert seller.profile.shop_active_until is None
    assert search.notification_enabled is False
    assert client.get(f"/api/v1/users/profile/{seller.username}").status_code == 404

    login_user(seller)
    repeated = client.post(
        "/api/v1/account/closure",
        json={"confirmation": "OBRIŠI"},
    )
    assert repeated.status_code == 200
    assert repeated.json()["data"]["scheduled_for"] == closed.json()["data"]["scheduled_for"]

    login_user(seller)
    cancelled = client.post(
        "/api/v1/account/closure/cancel",
        json={"confirmation": "ZADRŽI"},
    )
    assert cancelled.status_code == 200
    db.refresh(seller)
    db.refresh(listing)
    db.refresh(search)
    assert seller.status == "active"
    assert listing.status == "active"
    assert seller.profile.shop_active_until
    assert search.notification_enabled is True

    login_user(seller)
    assert client.post(
        "/api/v1/account/closure",
        json={"confirmation": "OBRIŠI"},
    ).status_code == 200
    closure = db.scalar(
        select(AccountClosure).where(AccountClosure.user_id == seller.id)
    )
    closure.scheduled_for = datetime.now(UTC) - timedelta(seconds=1)
    db.commit()
    assert finalize_account_closures(db) == 1
    db.refresh(seller)
    assert seller.status == "deleted"
    assert seller.email.endswith("@invalid.local")
    assert seller.username.startswith("obrisan_")
    assert seller.profile.display_name == "Obrisan korisnik"
    assert db.get(type(conversation), conversation.id)
    assert db.get(type(listing), listing.id)
    assert db.scalar(
        select(AuditLog).where(AuditLog.action == "account.anonymized")
    )


def test_recent_auth_suspension_and_production_policy_guards(
    client, db, factories, login_user, monkeypatch
):
    monkeypatch.setattr(settings, "account_closure_enabled", True)
    user = factories.user()
    login_user(user)
    session = db.scalar(
        select(AuthSession)
        .where(AuthSession.user_id == user.id)
        .order_by(AuthSession.created_at.desc())
    )
    session.created_at = datetime.now(UTC) - timedelta(hours=1)
    db.commit()
    stale = client.post(
        "/api/v1/account/closure",
        json={"confirmation": "OBRIŠI"},
    )
    assert stale.status_code == 403
    assert stale.json()["error"]["code"] == "RECENT_AUTH_REQUIRED"

    user.status = "suspended"
    db.commit()
    assert client.post("/api/v1/account/exports").status_code == 401
    assert client.post(
        "/api/v1/account/closure", json={"confirmation": "OBRIŠI"}
    ).status_code == 401

    try:
        Settings(
            app_env="production",
            secret_key="x" * 32,
            jwt_secret="y" * 32,
            resend_api_key="configured",
            postgres_password="z" * 24,
            account_closure_enabled=True,
            account_closure_policy_approved=False,
        )
    except ValueError as error:
        assert "ACCOUNT_CLOSURE_POLICY_APPROVED" in str(error)
    else:
        raise AssertionError("production closure enabled without policy approval")


def test_changing_verified_phone_queues_security_email(
    client, db, factories, login_user
):
    user = factories.user()
    user.profile.phone_number = "+381641234567"
    user.profile.phone_number_display = "064 123 4567"
    user.profile.phone_verified_at = datetime.now(UTC)
    db.commit()
    login_user(user)

    changed = client.patch(
        "/api/v1/users/me/profile",
        json={"phone_number": "065 987 6543"},
    )
    assert changed.status_code == 200
    assert changed.json()["data"]["phone_verified_at"] is None
    assert db.scalar(
        select(EmailOutbox).where(
            EmailOutbox.to_email == user.email,
            EmailOutbox.subject.contains("broj telefona je promenjen"),
        )
    )
