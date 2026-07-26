from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select

from app.core.config import settings
from app.models.phone_verification import PhoneVerificationChallenge
from app.models.review import Review
from app.services.message_service import MessageService
from app.services.phone_verification_service import (
    DisabledSMSVerificationProvider,
    PhoneVerificationService,
    TEST_VERIFICATION_CODE,
    normalize_phone_number,
)


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("064 123 4567", "+381641234567"),
        ("+381 64 123-4567", "+381641234567"),
        ("00381 (64) 123 4567", "+381641234567"),
        ("381641234567", "+381641234567"),
        ("+44 7700 900123", "+447700900123"),
    ],
)
def test_phone_normalization(raw, expected):
    normalized, display = normalize_phone_number(raw)
    assert normalized == expected
    assert display == " ".join(raw.strip().split())


@pytest.mark.parametrize("raw", ["", "12345", "064/ABC-123", "441234567890"])
def test_invalid_phone_numbers_are_rejected(raw):
    with pytest.raises(ValueError):
        normalize_phone_number(raw)


def test_feature_and_provider_are_disabled_safely(
    client, db, factories, login_user, monkeypatch
):
    user = factories.user()
    user.profile.phone_number = "+381641234567"
    user.profile.phone_number_display = "064 123 4567"
    db.commit()
    login_user(user)

    monkeypatch.setattr(settings, "phone_verification_enabled", False)
    profile = client.get("/api/v1/users/me/profile")
    assert profile.status_code == 200
    assert profile.json()["data"]["phone_verification_enabled"] is False
    assert (
        client.post("/api/v1/users/me/phone-verification/request").status_code
        == 404
    )

    monkeypatch.setattr(settings, "phone_verification_enabled", True)
    monkeypatch.setattr(settings, "app_env", "development")
    unavailable = client.post("/api/v1/users/me/phone-verification/request")
    assert unavailable.status_code == 503
    assert db.query(PhoneVerificationChallenge).count() == 0

    with pytest.raises(Exception) as error:
        PhoneVerificationService(
            db,
            provider=DisabledSMSVerificationProvider(),
        ).request_challenge(user)
    assert "Slanje SMS koda" in str(error.value)


def test_request_confirm_reuse_and_phone_change(
    client, db, factories, login_user, monkeypatch
):
    monkeypatch.setattr(settings, "phone_verification_enabled", True)
    monkeypatch.setattr(settings, "app_env", "test")
    user = factories.user()
    login_user(user)

    updated = client.patch(
        "/api/v1/users/me/profile",
        json={"phone_number": "064 123-4567", "phone_visible": False},
    )
    assert updated.status_code == 200
    assert updated.json()["data"]["phone_number"] == "064 123-4567"
    assert updated.json()["data"]["phone_number_e164"] == "+381641234567"
    assert updated.json()["data"]["phone_verified_at"] is None

    requested = client.post("/api/v1/users/me/phone-verification/request")
    assert requested.status_code == 200
    challenge_id = requested.json()["data"]["challenge_id"]
    assert "+381641234567" not in str(requested.json())
    challenge = db.get(PhoneVerificationChallenge, challenge_id)
    assert challenge
    assert challenge.code_hash != TEST_VERIFICATION_CODE
    assert challenge.provider_reference == f"test:{challenge.id}"
    assert timedelta(minutes=9) < (
        challenge.expires_at.replace(tzinfo=UTC) - datetime.now(UTC)
    ) <= timedelta(minutes=10)

    cooldown = client.post("/api/v1/users/me/phone-verification/request")
    assert cooldown.status_code == 429
    assert cooldown.json()["error"]["code"] == "PHONE_RESEND_COOLDOWN"

    confirmed = client.post(
        "/api/v1/users/me/phone-verification/confirm",
        json={
            "challenge_id": challenge.id,
            "code": TEST_VERIFICATION_CODE,
        },
    )
    assert confirmed.status_code == 200
    assert confirmed.json()["data"]["phone_verified_at"]

    reused = client.post(
        "/api/v1/users/me/phone-verification/confirm",
        json={
            "challenge_id": challenge.id,
            "code": TEST_VERIFICATION_CODE,
        },
    )
    assert reused.status_code == 409

    same_number = client.patch(
        "/api/v1/users/me/profile",
        json={"phone_number": "+381 64 123 4567"},
    )
    assert same_number.status_code == 200
    assert same_number.json()["data"]["phone_verified_at"]

    changed = client.patch(
        "/api/v1/users/me/profile",
        json={"phone_number": "065 999 8877"},
    )
    assert changed.status_code == 200
    assert changed.json()["data"]["phone_verified_at"] is None
    assert changed.json()["data"]["phone_number_e164"] == "+381659998877"


def test_expiry_brute_force_and_challenge_ownership(
    client, db, factories, login_user, monkeypatch
):
    monkeypatch.setattr(settings, "phone_verification_enabled", True)
    monkeypatch.setattr(settings, "app_env", "test")
    owner = factories.user()
    other = factories.user()
    owner.profile.phone_number = "+381641111111"
    other.profile.phone_number = "+381642222222"
    db.commit()

    login_user(owner)
    expired_response = client.post(
        "/api/v1/users/me/phone-verification/request"
    )
    expired = db.get(
        PhoneVerificationChallenge,
        expired_response.json()["data"]["challenge_id"],
    )
    expired.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    db.commit()
    assert (
        client.post(
            "/api/v1/users/me/phone-verification/confirm",
            json={"challenge_id": expired.id, "code": TEST_VERIFICATION_CODE},
        ).status_code
        == 410
    )

    expired.resend_available_at = datetime.now(UTC) - timedelta(seconds=1)
    db.commit()
    active_response = client.post(
        "/api/v1/users/me/phone-verification/request"
    )
    active = db.get(
        PhoneVerificationChallenge,
        active_response.json()["data"]["challenge_id"],
    )
    login_user(other)
    unauthorized = client.post(
        "/api/v1/users/me/phone-verification/confirm",
        json={"challenge_id": active.id, "code": TEST_VERIFICATION_CODE},
    )
    assert unauthorized.status_code == 404

    login_user(owner)
    for attempt in range(5):
        response = client.post(
            "/api/v1/users/me/phone-verification/confirm",
            json={"challenge_id": active.id, "code": "000000"},
        )
        assert response.status_code == (429 if attempt == 4 else 400)
    assert active.attempt_count == 5
    blocked = client.post(
        "/api/v1/users/me/phone-verification/confirm",
        json={"challenge_id": active.id, "code": TEST_VERIFICATION_CODE},
    )
    assert blocked.status_code == 429
    db.refresh(owner.profile)
    assert owner.profile.phone_verified_at is None


def test_daily_user_and_number_limits(db, factories, monkeypatch):
    monkeypatch.setattr(settings, "phone_verification_enabled", True)
    monkeypatch.setattr(settings, "app_env", "test")
    user = factories.user()
    user.profile.phone_number = "+381643333333"
    db.commit()
    service = PhoneVerificationService(db)

    for _index in range(5):
        challenge = service.request_challenge(user)
        challenge.resend_available_at = datetime.now(UTC) - timedelta(seconds=1)
        db.commit()
    with pytest.raises(Exception) as user_limit:
        service.request_challenge(user)
    assert "Dnevni limit" in str(user_limit.value)

    shared_phone = "+381644444444"
    for index in range(5):
        other = factories.user()
        other.profile.phone_number = shared_phone
        db.commit()
        if index:
            latest = db.scalar(
                select(PhoneVerificationChallenge)
                .where(
                    PhoneVerificationChallenge.phone_e164 == shared_phone
                )
                .order_by(PhoneVerificationChallenge.created_at.desc())
            )
            latest.resend_available_at = datetime.now(UTC) - timedelta(seconds=1)
            db.commit()
        PhoneVerificationService(db).request_challenge(other)
    sixth = factories.user()
    sixth.profile.phone_number = shared_phone
    latest = db.scalar(
        select(PhoneVerificationChallenge)
        .where(PhoneVerificationChallenge.phone_e164 == shared_phone)
        .order_by(PhoneVerificationChallenge.created_at.desc())
    )
    latest.resend_available_at = datetime.now(UTC) - timedelta(seconds=1)
    db.commit()
    with pytest.raises(Exception) as number_limit:
        PhoneVerificationService(db).request_challenge(sixth)
    assert "Dnevni limit" in str(number_limit.value)


def test_private_phone_never_leaks_and_trust_is_factual(
    client, db, factories, login_user
):
    seller = factories.user()
    seller.profile.phone_number = "+381649999999"
    seller.profile.phone_number_display = "064 999 9999"
    seller.profile.phone_verified_at = datetime.now(UTC)
    seller.profile.phone_visible = False
    buyer = factories.user()
    category = factories.category()
    sold = factories.listing(seller, category, status="sold")
    sold.sold_to_user_id = buyer.id
    active = factories.listing(seller, category)
    review = Review(
        listing_id=sold.id,
        reviewer_id=buyer.id,
        reviewee_id=seller.id,
        rating=5,
        comment="Odlično",
    )
    db.add(review)
    db.commit()

    profile = client.get(f"/api/v1/users/profile/{seller.username}")
    assert profile.status_code == 200
    public_data = profile.json()["data"]
    assert "phone_number" not in public_data
    assert "+381649999999" not in str(public_data)
    assert public_data["trust"]["email_verified"] is True
    assert public_data["trust"]["phone_verified"] is True
    assert public_data["trust"]["review_count"] == 1
    assert public_data["trust"]["rating_average"] == 5.0
    assert public_data["trust"]["completed_sale_count"] == 1

    listing = client.get(f"/api/v1/listings/{active.slug}")
    assert listing.status_code == 200
    assert "+381649999999" not in str(listing.json())
    assert listing.json()["data"]["seller"]["trust"]["phone_verified"] is True

    MessageService(db).send_for_listing(active.id, buyer, "Pozdrav")
    login_user(buyer)
    conversations = client.get("/api/v1/conversations")
    assert conversations.status_code == 200
    assert "+381649999999" not in str(conversations.json())
    counterpart = conversations.json()["data"][0]["counterpart"]
    assert counterpart["trust"]["phone_verified"] is True
    assert counterpart["trust"]["completed_sale_count"] == 1
