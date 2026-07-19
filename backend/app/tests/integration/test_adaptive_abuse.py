from datetime import UTC, datetime, timedelta

import httpx
from sqlalchemy import select

from app.core import turnstile
from app.core.config import settings
from app.models import AbuseSignal, AuditLog, ModerationCase
from app.schemas.listing import ListingCreate
from app.services.listing_service import ListingService
from app.services.risk_service import RiskService, hash_network_identifier

TEST_SITE_KEY = "1x00000000000000000000AA"
TEST_SECRET_KEY = "1x0000000000000000000000000000000AA"


def listing_payload(category_id: str, title: str = "Shimano test štap") -> ListingCreate:
    return ListingCreate(
        category_id=category_id,
        title=title,
        description="Detaljan normalizovan opis oglasa za proveru duplikata.",
        condition="used_good",
        price_amount=12000,
        currency="RSD",
        city="Beograd",
        attributes={},
    )


def test_normal_registration_has_no_challenge_or_case(client, db, monkeypatch):
    monkeypatch.setattr(settings, "turnstile_enabled", True)
    monkeypatch.setattr(settings, "turnstile_site_key", TEST_SITE_KEY)
    monkeypatch.setattr(settings, "turnstile_secret_key", TEST_SECRET_KEY)

    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "normal@example.com",
            "username": "normal_user",
            "password": "StrongPassword123!",
            "accepted_terms": True,
        },
    )

    assert response.status_code == 200
    assert db.scalar(select(ModerationCase)) is None


def test_suspicious_registration_requires_challenge_and_creates_case(client, db, monkeypatch):
    monkeypatch.setattr(settings, "turnstile_enabled", True)
    monkeypatch.setattr(settings, "turnstile_secret_key", TEST_SECRET_KEY)
    network_hash = hash_network_identifier("testclient")
    now = datetime.now(UTC)
    for index in range(3):
        db.add(
            AbuseSignal(
                signal_type="registration_attempt",
                network_hash=network_hash,
                score=0,
                metadata_json={"sequence": index},
                expires_at=now + timedelta(days=7),
            )
        )
    db.commit()

    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "suspicious@example.com",
            "username": "suspicious_user",
            "password": "StrongPassword123!",
            "accepted_terms": True,
        },
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "challenge_required"
    case = db.scalar(select(ModerationCase))
    assert case is not None
    assert case.reason_codes == ["registration_velocity"]
    assert case.risk_score == 60


def test_valid_challenge_resubmits_without_losing_registration(client, db, monkeypatch):
    monkeypatch.setattr(settings, "turnstile_enabled", True)
    network_hash = hash_network_identifier("testclient")
    now = datetime.now(UTC)
    for _ in range(3):
        db.add(
            AbuseSignal(
                signal_type="registration_attempt",
                network_hash=network_hash,
                score=0,
                expires_at=now + timedelta(days=7),
            )
        )
    db.commit()
    monkeypatch.setattr(
        "app.services.risk_service.verify_turnstile_token",
        lambda token, remote_ip: None,
    )

    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "challenged@example.com",
            "username": "challenged_user",
            "password": "StrongPassword123!",
            "accepted_terms": True,
            "turnstile_token": "test-token",
        },
    )

    assert response.status_code == 200
    assert db.scalar(
        select(AbuseSignal).where(AbuseSignal.signal_type == "challenge_passed")
    )


def test_duplicate_fingerprints_flag_same_and_cross_user_without_removal(db, factories):
    category = factories.category()
    seller = factories.user()
    other_seller = factories.user()
    first = ListingService(db).create(seller, listing_payload(category.id))
    second = ListingService(db).create(seller, listing_payload(category.id))
    third = ListingService(db).create(other_seller, listing_payload(category.id))

    cases = list(
        db.scalars(
            select(ModerationCase).where(ModerationCase.entity_type == "listing")
        ).all()
    )
    reasons = {reason for case in cases for reason in case.reason_codes}
    assert {"duplicate_same_user", "duplicate_cross_user"} <= reasons
    assert {first.status, second.status, third.status} == {"pending_review"}


def test_admin_queue_authorization_bulk_resolution_and_audit(client, db, factories, login_user):
    seller = factories.user()
    category = factories.category()
    listing = factories.listing(seller, category, status="pending_review")
    case = RiskService(db).create_case(
        "listing",
        listing.id,
        seller.id,
        80,
        ["duplicate_cross_user"],
    )
    db.commit()

    anonymous = client.get("/api/v1/admin/moderation-cases")
    assert anonymous.status_code == 401

    admin = factories.user(role="admin")
    login_user(admin)
    queue = client.get("/api/v1/admin/moderation-cases?status=open")
    assert queue.status_code == 200
    assert queue.json()["data"][0]["risk_score"] == 80
    assert "network_hash" not in queue.text
    filtered = client.get(
        "/api/v1/admin/moderation-cases?reason=duplicate_cross_user"
    )
    assert filtered.status_code == 200
    assert [item["id"] for item in filtered.json()["data"]] == [case.id]

    resolved = client.post(
        "/api/v1/admin/moderation-cases/bulk",
        json={"case_ids": [case.id], "action": "clear", "note": "Provereno ručno"},
    )
    assert resolved.status_code == 200
    assert resolved.json()["data"][0]["status"] == "cleared"
    audit = db.scalar(
        select(AuditLog).where(AuditLog.action == "moderation_case.cleared")
    )
    assert audit is not None


def test_expired_abuse_signals_are_purged(db):
    db.add(
        AbuseSignal(
            signal_type="login_attempt",
            network_hash="hashed-only",
            score=0,
            expires_at=datetime.now(UTC) - timedelta(seconds=1),
        )
    )
    db.commit()
    assert RiskService(db).purge_expired_signals() == 1
    assert db.scalar(select(AbuseSignal)) is None


class SiteverifyResponse:
    def __init__(self, payload: dict):
        self.payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self.payload


def test_turnstile_success_invalid_reuse_and_provider_outage(monkeypatch):
    monkeypatch.setattr(settings, "turnstile_enabled", True)
    monkeypatch.setattr(settings, "turnstile_secret_key", TEST_SECRET_KEY)
    monkeypatch.setattr(
        turnstile.httpx,
        "post",
        lambda *args, **kwargs: SiteverifyResponse({"success": True}),
    )
    turnstile.verify_turnstile_token("valid-test-token")

    monkeypatch.setattr(
        turnstile.httpx,
        "post",
        lambda *args, **kwargs: SiteverifyResponse(
            {"success": False, "error-codes": ["timeout-or-duplicate"]}
        ),
    )
    try:
        turnstile.verify_turnstile_token("used-test-token")
    except Exception as exc:
        assert exc.detail["error"]["code"] == "challenge_required"
    else:
        raise AssertionError("A reused token must fail")

    def timeout(*args, **kwargs):
        raise httpx.ReadTimeout("provider timeout")

    monkeypatch.setattr(turnstile.httpx, "post", timeout)
    try:
        turnstile.verify_turnstile_token("provider-timeout")
    except Exception as exc:
        assert exc.status_code == 503
        assert exc.detail["error"]["code"] == "challenge_unavailable"
    else:
        raise AssertionError("A provider outage must not bypass a required challenge")

    monkeypatch.setattr(settings, "turnstile_enabled", False)
    turnstile.verify_turnstile_token(None)
