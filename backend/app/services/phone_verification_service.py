from __future__ import annotations

import hashlib
import hmac
import re
from datetime import UTC, datetime, timedelta
from secrets import randbelow
from typing import Protocol

from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.responses import api_error
from app.models.phone_verification import PhoneVerificationChallenge
from app.models.user import User

CODE_LIFETIME = timedelta(minutes=10)
RESEND_COOLDOWN = timedelta(seconds=60)
MAX_CONFIRMATION_ATTEMPTS = 5
MAX_DAILY_REQUESTS_PER_USER = 5
MAX_DAILY_REQUESTS_PER_NUMBER = 5
TEST_VERIFICATION_CODE = "123456"


class SMSVerificationProvider(Protocol):
    available: bool

    def send_code(
        self,
        phone_e164: str,
        code: str,
        challenge_id: str,
    ) -> str | None: ...


class DisabledSMSVerificationProvider:
    available = False

    def send_code(
        self,
        phone_e164: str,
        code: str,
        challenge_id: str,
    ) -> str | None:
        raise RuntimeError("SMS provider is disabled.")


class DeterministicTestSMSProvider:
    available = True

    def send_code(
        self,
        phone_e164: str,
        code: str,
        challenge_id: str,
    ) -> str:
        return f"test:{challenge_id}"


def get_sms_verification_provider() -> SMSVerificationProvider:
    if settings.app_env == "test":
        return DeterministicTestSMSProvider()
    return DisabledSMSVerificationProvider()


def normalize_phone_number(value: str) -> tuple[str, str]:
    display = " ".join(value.strip().split())[:40]
    if not display:
        raise ValueError("Unesite broj telefona.")
    compact = re.sub(r"[\s()./-]", "", display)
    if compact.startswith("00"):
        compact = f"+{compact[2:]}"
    elif compact.startswith("0"):
        compact = f"+381{compact[1:]}"
    elif compact.startswith("381"):
        compact = f"+{compact}"
    if not re.fullmatch(r"\+[1-9]\d{7,14}", compact):
        raise ValueError(
            "Unesite broj u domaćem formatu ili međunarodnom formatu sa znakom +."
        )
    return compact, display


def mask_phone_number(phone_e164: str) -> str:
    visible = phone_e164[-4:]
    country = phone_e164[:4] if phone_e164.startswith("+381") else phone_e164[:3]
    return f"{country}••••{visible}"


class PhoneVerificationService:
    def __init__(
        self,
        db: Session,
        provider: SMSVerificationProvider | None = None,
    ):
        self.db = db
        self.provider = provider or get_sms_verification_provider()

    def request_challenge(self, user: User) -> PhoneVerificationChallenge:
        self._ensure_enabled()
        if not self.provider.available:
            raise api_error(
                "PHONE_PROVIDER_DISABLED",
                "Slanje SMS koda trenutno nije dostupno.",
                503,
            )
        profile = user.profile
        if not profile or not profile.phone_number:
            raise api_error(
                "PHONE_REQUIRED",
                "Prvo sačuvajte broj telefona na profilu.",
                422,
            )
        phone_e164 = profile.phone_number
        if profile.phone_verified_at:
            raise api_error(
                "PHONE_ALREADY_VERIFIED",
                "Ovaj broj telefona je već potvrđen.",
                409,
            )
        now = datetime.now(UTC)
        latest = self.db.scalar(
            select(PhoneVerificationChallenge)
            .where(
                or_(
                    PhoneVerificationChallenge.user_id == user.id,
                    PhoneVerificationChallenge.phone_e164 == phone_e164,
                ),
                PhoneVerificationChallenge.consumed_at.is_(None),
            )
            .order_by(PhoneVerificationChallenge.last_sent_at.desc())
        )
        if latest and _as_utc(latest.resend_available_at) > now:
            retry_after = max(
                int((_as_utc(latest.resend_available_at) - now).total_seconds()),
                1,
            )
            raise api_error(
                "PHONE_RESEND_COOLDOWN",
                "Sačekajte pre ponovnog slanja koda.",
                429,
                {"retry_after_seconds": retry_after},
            )
        cutoff = now - timedelta(days=1)
        user_requests = int(
            self.db.scalar(
                select(func.count(PhoneVerificationChallenge.id)).where(
                    PhoneVerificationChallenge.user_id == user.id,
                    PhoneVerificationChallenge.created_at >= cutoff,
                )
            )
            or 0
        )
        number_requests = int(
            self.db.scalar(
                select(func.count(PhoneVerificationChallenge.id)).where(
                    PhoneVerificationChallenge.phone_e164 == phone_e164,
                    PhoneVerificationChallenge.created_at >= cutoff,
                )
            )
            or 0
        )
        if (
            user_requests >= MAX_DAILY_REQUESTS_PER_USER
            or number_requests >= MAX_DAILY_REQUESTS_PER_NUMBER
        ):
            raise api_error(
                "PHONE_DAILY_LIMIT",
                "Dnevni limit za slanje kodova je dostignut.",
                429,
            )
        self.db.execute(
            update(PhoneVerificationChallenge)
            .where(
                or_(
                    PhoneVerificationChallenge.user_id == user.id,
                    PhoneVerificationChallenge.phone_e164 == phone_e164,
                ),
                PhoneVerificationChallenge.consumed_at.is_(None),
            )
            .values(consumed_at=now)
        )
        challenge = PhoneVerificationChallenge(
            user_id=user.id,
            phone_e164=phone_e164,
            code_hash="pending",
            expires_at=now + CODE_LIFETIME,
            last_sent_at=now,
            resend_available_at=now + RESEND_COOLDOWN,
        )
        self.db.add(challenge)
        self.db.flush()
        code = (
            TEST_VERIFICATION_CODE
            if settings.app_env == "test"
            else f"{randbelow(1_000_000):06d}"
        )
        challenge.code_hash = self._hash_code(challenge.id, code)
        challenge.provider_reference = self.provider.send_code(
            phone_e164,
            code,
            challenge.id,
        )
        self.db.commit()
        self.db.refresh(challenge)
        return challenge

    def confirm(
        self,
        user: User,
        challenge_id: str,
        code: str,
    ) -> User:
        self._ensure_enabled()
        challenge = self.db.scalar(
            select(PhoneVerificationChallenge).where(
                PhoneVerificationChallenge.id == challenge_id,
                PhoneVerificationChallenge.user_id == user.id,
            )
        )
        if not challenge:
            raise api_error(
                "NOT_FOUND",
                "Zahtev za potvrdu nije pronađen.",
                404,
            )
        now = datetime.now(UTC)
        if challenge.consumed_at:
            raise api_error(
                "PHONE_CODE_CONSUMED",
                "Ovaj kod je već iskorišćen.",
                409,
            )
        if _as_utc(challenge.expires_at) <= now:
            challenge.consumed_at = now
            self.db.commit()
            raise api_error(
                "PHONE_CODE_EXPIRED",
                "Kod je istekao. Zatražite novi.",
                410,
            )
        if challenge.attempt_count >= MAX_CONFIRMATION_ATTEMPTS:
            raise api_error(
                "PHONE_ATTEMPTS_EXCEEDED",
                "Prekoračen je broj pokušaja. Zatražite novi kod.",
                429,
            )
        if not re.fullmatch(r"\d{6}", code):
            self._record_failed_attempt(challenge)
        expected = self._hash_code(challenge.id, code)
        if not hmac.compare_digest(expected, challenge.code_hash):
            self._record_failed_attempt(challenge)
        if (
            not user.profile
            or user.profile.phone_number != challenge.phone_e164
        ):
            challenge.consumed_at = now
            self.db.commit()
            raise api_error(
                "PHONE_CHANGED",
                "Broj telefona je promenjen. Zatražite novi kod.",
                409,
            )
        challenge.consumed_at = now
        user.profile.phone_verified_at = now
        self.db.commit()
        self.db.refresh(user)
        return user

    @staticmethod
    def _hash_code(challenge_id: str, code: str) -> str:
        return hmac.new(
            settings.secret_key.encode(),
            f"{challenge_id}:{code}".encode(),
            hashlib.sha256,
        ).hexdigest()

    def _record_failed_attempt(
        self,
        challenge: PhoneVerificationChallenge,
    ) -> None:
        challenge.attempt_count += 1
        self.db.commit()
        remaining = max(MAX_CONFIRMATION_ATTEMPTS - challenge.attempt_count, 0)
        if remaining == 0:
            raise api_error(
                "PHONE_ATTEMPTS_EXCEEDED",
                "Prekoračen je broj pokušaja. Zatražite novi kod.",
                429,
            )
        raise api_error(
            "PHONE_CODE_INVALID",
            "Kod nije ispravan.",
            400,
            {"attempts_remaining": remaining},
        )

    @staticmethod
    def _ensure_enabled() -> None:
        if not settings.phone_verification_enabled:
            raise api_error(
                "FEATURE_DISABLED",
                "Potvrda telefona trenutno nije dostupna.",
                404,
            )


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)
