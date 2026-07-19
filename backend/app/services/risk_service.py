from __future__ import annotations

import hashlib
import hmac
import re
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from fastapi import HTTPException, Request
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.turnstile import verify_turnstile_token
from app.models.audit import AuditLog
from app.models.listing import Listing
from app.models.moderation_case import AbuseSignal, ListingFingerprint, ModerationCase
from app.models.report import Report

ACTION_RULES: dict[str, tuple[int, timedelta, int, str]] = {
    "registration_attempt": (3, timedelta(minutes=10), 60, "registration_velocity"),
    "login_attempt": (8, timedelta(minutes=10), 55, "login_velocity"),
    "reset_attempt": (3, timedelta(minutes=30), 55, "reset_velocity"),
    "listing_publish": (5, timedelta(days=1), 60, "listing_publish_velocity"),
    "first_message": (8, timedelta(hours=1), 60, "first_message_velocity"),
}
OPEN_CASE_STATUSES = {"open", "reviewing"}


def network_identifier(request: Request) -> str:
    forwarded = request.headers.get("cf-connecting-ip") or request.headers.get("x-forwarded-for")
    return forwarded.split(",", 1)[0].strip() if forwarded else (request.client.host if request.client else "unknown")


def hash_network_identifier(value: str) -> str:
    return hmac.new(settings.secret_key.encode(), value.encode(), hashlib.sha256).hexdigest()


def normalized_text(value: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s]", " ", value.casefold())).strip()


class RiskService:
    def __init__(self, db: Session):
        self.db = db

    def enforce(
        self,
        action: str,
        request: Request,
        actor_user_id: str | None = None,
        token: str | None = None,
        entity_type: str | None = None,
        entity_id: str | None = None,
    ) -> None:
        rule = ACTION_RULES[action]
        limit, window, score, reason = rule
        now = datetime.now(UTC)
        network_hash = hash_network_identifier(network_identifier(request))
        filters = [
            AbuseSignal.signal_type == action,
            AbuseSignal.created_at >= now - window,
        ]
        identity_filter = AbuseSignal.actor_user_id == actor_user_id if actor_user_id else AbuseSignal.network_hash == network_hash
        count = self.db.scalar(select(func.count(AbuseSignal.id)).where(*filters, identity_filter)) or 0
        failed_challenges = self.db.scalar(
            select(func.count(AbuseSignal.id)).where(
                AbuseSignal.signal_type == "challenge_failed",
                AbuseSignal.created_at >= now - timedelta(hours=1),
                identity_filter,
            )
        ) or 0
        challenge_needed = count >= limit or failed_challenges >= 2
        if not challenge_needed:
            return

        case = self.create_case(
            entity_type or ("user" if actor_user_id else "network"),
            entity_id or actor_user_id or network_hash,
            actor_user_id,
            min(score + int(failed_challenges) * 10, 100),
            [reason] + (["repeated_failed_challenge"] if failed_challenges else []),
        )
        if not settings.turnstile_enabled:
            return
        try:
            verify_turnstile_token(token, network_identifier(request))
        except HTTPException:
            self.record_signal(
                "challenge_failed",
                actor_user_id,
                network_hash,
                case.entity_type,
                case.entity_id,
                20,
            )
            self.db.commit()
            raise
        self.record_signal(
            "challenge_passed",
            actor_user_id,
            network_hash,
            case.entity_type,
            case.entity_id,
            0,
        )
        self.db.commit()

    def record_action(
        self,
        action: str,
        request: Request,
        actor_user_id: str | None = None,
        entity_type: str | None = None,
        entity_id: str | None = None,
    ) -> None:
        self.record_signal(
            action,
            actor_user_id,
            hash_network_identifier(network_identifier(request)),
            entity_type,
            entity_id,
            0,
        )
        self.db.commit()

    def record_signal(
        self,
        signal_type: str,
        actor_user_id: str | None,
        network_hash: str | None,
        entity_type: str | None,
        entity_id: str | None,
        score: int,
        metadata: dict | None = None,
    ) -> AbuseSignal:
        signal = AbuseSignal(
            signal_type=signal_type,
            actor_user_id=actor_user_id,
            network_hash=network_hash,
            entity_type=entity_type,
            entity_id=entity_id,
            score=score,
            metadata_json=metadata or {},
            expires_at=datetime.now(UTC) + timedelta(days=settings.abuse_signal_retention_days),
        )
        self.db.add(signal)
        return signal

    def create_case(
        self,
        entity_type: str,
        entity_id: str,
        subject_user_id: str | None,
        score: int,
        reason_codes: list[str],
    ) -> ModerationCase:
        case = self.db.scalar(
            select(ModerationCase).where(
                ModerationCase.entity_type == entity_type,
                ModerationCase.entity_id == entity_id,
                ModerationCase.status.in_(OPEN_CASE_STATUSES),
            )
        )
        if case:
            case.risk_score = max(case.risk_score, score)
            case.reason_codes = sorted(set(case.reason_codes) | set(reason_codes))
            self.db.flush()
            return case
        case = ModerationCase(
            entity_type=entity_type,
            entity_id=entity_id,
            subject_user_id=subject_user_id,
            risk_score=score,
            reason_codes=sorted(set(reason_codes)),
        )
        self.db.add(case)
        self.db.flush()
        return case

    def fingerprint_listing(self, listing: Listing) -> ListingFingerprint:
        price = str(Decimal(listing.price_amount).quantize(Decimal("0.01")))
        content = "\n".join(
            [
                normalized_text(listing.title),
                normalized_text(listing.description),
                listing.category_id,
                price,
                listing.currency,
            ]
        )
        content_hash = hashlib.sha256(content.encode()).hexdigest()
        image_hashes = sorted(image.content_hash for image in listing.images if image.content_hash)
        combined_hash = hashlib.sha256(f"{content_hash}|{'|'.join(image_hashes)}".encode()).hexdigest()
        fingerprint = self.db.scalar(
            select(ListingFingerprint).where(ListingFingerprint.listing_id == listing.id)
        )
        if fingerprint:
            fingerprint.content_hash = content_hash
            fingerprint.image_hashes = image_hashes
            fingerprint.combined_hash = combined_hash
        else:
            fingerprint = ListingFingerprint(
                listing_id=listing.id,
                seller_id=listing.seller_id,
                content_hash=content_hash,
                image_hashes=image_hashes,
                combined_hash=combined_hash,
            )
            self.db.add(fingerprint)
        self.db.flush()

        duplicate_conditions = [ListingFingerprint.content_hash == content_hash]
        if image_hashes:
            duplicate_conditions.append(ListingFingerprint.image_hashes == image_hashes)
        duplicate = self.db.scalar(
            select(ListingFingerprint).where(
                ListingFingerprint.listing_id != listing.id,
                or_(*duplicate_conditions),
            )
        )
        if duplicate:
            cross_user = duplicate.seller_id != listing.seller_id
            reason = "duplicate_cross_user" if cross_user else "duplicate_same_user"
            score = 75 if cross_user else 60
            self.create_case("listing", listing.id, listing.seller_id, score, [reason])
            self.record_signal(
                reason,
                listing.seller_id,
                None,
                "listing",
                listing.id,
                score,
                {"related_listing_id": duplicate.listing_id},
            )
        self.db.commit()
        return fingerprint

    def record_report_history(self, report: Report, listing: Listing) -> None:
        count = self.db.scalar(
            select(func.count(Report.id)).where(
                Report.reported_user_id == listing.seller_id,
                Report.status.in_(["open", "reviewing", "resolved"]),
            )
        ) or 0
        score = min(int(count) * 20, 80)
        self.record_signal(
            "listing_reported",
            listing.seller_id,
            None,
            "listing",
            listing.id,
            score,
            {"report_id": report.id},
        )
        if count >= 2:
            self.create_case(
                "listing",
                listing.id,
                listing.seller_id,
                score,
                ["repeated_report_history"],
            )
        self.db.commit()

    def record_rejection_history(self, listing: Listing) -> None:
        count = self.db.scalar(
            select(func.count(AuditLog.id)).where(
                AuditLog.action == "listing.rejected",
                AuditLog.metadata_json["seller_id"].as_string() == listing.seller_id,
            )
        ) or 0
        if count >= 2:
            self.create_case(
                "user",
                listing.seller_id,
                listing.seller_id,
                min(int(count) * 20, 80),
                ["repeated_rejection_history"],
            )
        self.db.commit()

    def purge_expired_signals(self) -> int:
        rows = list(
            self.db.scalars(
                select(AbuseSignal).where(AbuseSignal.expires_at < datetime.now(UTC))
            ).all()
        )
        for row in rows:
            self.db.delete(row)
        self.db.commit()
        return len(rows)
