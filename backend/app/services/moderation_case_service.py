from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.responses import api_error
from app.models.audit import AuditLog
from app.models.listing import PUBLIC_LISTING_STATUSES, Listing
from app.models.moderation_case import ModerationCase
from app.models.user import User
from app.services.moderation_service import ModerationService

CASE_STATUSES = {"open", "reviewing", "cleared", "approved", "rejected"}


def serialize_case(case: ModerationCase, db: Session) -> dict:
    subject = db.get(User, case.subject_user_id) if case.subject_user_id else None
    listing = db.get(Listing, case.entity_id) if case.entity_type == "listing" else None
    display_entity_id = "anonymous" if case.entity_type == "network" else case.entity_id
    return {
        "id": case.id,
        "entity_type": case.entity_type,
        "entity_id": display_entity_id,
        "entity": (
            {"title": listing.title, "slug": listing.slug, "status": listing.status}
            if listing
            else None
        ),
        "subject": (
            {"id": subject.id, "username": subject.username, "status": subject.status}
            if subject
            else None
        ),
        "risk_score": case.risk_score,
        "reason_codes": case.reason_codes,
        "status": case.status,
        "assigned_admin_id": case.assigned_admin_id,
        "internal_notes": case.internal_notes,
        "resolved_at": case.resolved_at,
        "created_at": case.created_at,
        "updated_at": case.updated_at,
    }


class ModerationCaseService:
    def __init__(self, db: Session):
        self.db = db

    def list_cases(
        self,
        status: str | None = None,
        reason: str | None = None,
        entity_type: str | None = None,
        cursor: str | None = None,
        limit: int = 30,
    ) -> tuple[list[ModerationCase], str | None]:
        if status and status not in CASE_STATUSES:
            raise api_error("VALIDATION_ERROR", "Nepoznat status slučaja.", 422)
        query = select(ModerationCase)
        if status:
            query = query.where(ModerationCase.status == status)
        if entity_type:
            query = query.where(ModerationCase.entity_type == entity_type)
        if reason:
            query = query.where(ModerationCase.reason_codes.contains(reason))
        if cursor:
            anchor = self.db.get(ModerationCase, cursor)
            if not anchor:
                raise api_error("VALIDATION_ERROR", "Kursor nije važeći.", 422)
            query = query.where(
                or_(
                    ModerationCase.risk_score < anchor.risk_score,
                    (
                        (ModerationCase.risk_score == anchor.risk_score)
                        & (ModerationCase.created_at < anchor.created_at)
                    ),
                    (
                        (ModerationCase.risk_score == anchor.risk_score)
                        & (ModerationCase.created_at == anchor.created_at)
                        & (ModerationCase.id < anchor.id)
                    ),
                )
            )
        rows = list(
            self.db.scalars(
                query.order_by(
                    ModerationCase.risk_score.desc(),
                    ModerationCase.created_at.desc(),
                    ModerationCase.id.desc(),
                ).limit(limit + 1)
            ).all()
        )
        next_cursor = rows[limit - 1].id if len(rows) > limit else None
        return rows[:limit], next_cursor

    def related_history(self, case_id: str) -> dict:
        case = self.get(case_id)
        case_filters = [
            (ModerationCase.entity_type == case.entity_type)
            & (ModerationCase.entity_id == case.entity_id)
        ]
        if case.subject_user_id:
            case_filters.append(ModerationCase.subject_user_id == case.subject_user_id)
        cases = self.db.scalars(
            select(ModerationCase)
            .where(or_(*case_filters))
            .order_by(ModerationCase.created_at.desc())
            .limit(20)
        ).all()
        audits = self.db.scalars(
            select(AuditLog)
            .where(
                or_(
                    (AuditLog.entity_type == "moderation_case") & (AuditLog.entity_id == case.id),
                    (AuditLog.entity_type == case.entity_type) & (AuditLog.entity_id == case.entity_id),
                )
            )
            .order_by(AuditLog.created_at.desc())
            .limit(50)
        ).all()
        return {
            "cases": [serialize_case(item, self.db) for item in cases],
            "audit": [
                {
                    "id": row.id,
                    "actor_user_id": row.actor_user_id,
                    "action": row.action,
                    "metadata": row.metadata_json,
                    "created_at": row.created_at,
                }
                for row in audits
            ],
        }

    def assign(self, case_id: str, admin: User, assigned: bool) -> ModerationCase:
        case = self.get(case_id)
        case.assigned_admin_id = admin.id if assigned else None
        if assigned and case.status == "open":
            case.status = "reviewing"
        self.audit(admin, case, "moderation_case.assigned" if assigned else "moderation_case.unassigned")
        self.db.commit()
        self.db.refresh(case)
        return case

    def add_note(self, case_id: str, admin: User, note: str) -> ModerationCase:
        case = self.get(case_id)
        timestamp = datetime.now(UTC).isoformat(timespec="minutes")
        entry = f"[{timestamp}] {admin.username}: {note.strip()}"
        case.internal_notes = f"{case.internal_notes}\n{entry}".strip() if case.internal_notes else entry
        self.audit(admin, case, "moderation_case.note_added")
        self.db.commit()
        self.db.refresh(case)
        return case

    def bulk_action(
        self,
        case_ids: list[str],
        admin: User,
        action: str,
        note: str | None,
    ) -> list[ModerationCase]:
        cases = list(
            self.db.scalars(select(ModerationCase).where(ModerationCase.id.in_(case_ids))).all()
        )
        if len(cases) != len(set(case_ids)):
            raise api_error("NOT_FOUND", "Jedan ili više slučajeva nisu pronađeni.", 404)
        moderation = ModerationService(self.db)
        for case in cases:
            case.assigned_admin_id = admin.id
            if action == "approve" and case.entity_type == "listing":
                listing = self.db.get(Listing, case.entity_id)
                if listing and listing.status not in PUBLIC_LISTING_STATUSES:
                    moderation.approve_listing(listing.id, admin)
            elif action == "reject" and case.entity_type == "listing":
                listing = self.db.get(Listing, case.entity_id)
                if listing and listing.status not in {"rejected", "deleted"}:
                    moderation.reject_listing(
                        listing.id,
                        admin,
                        note or "Odbijeno nakon pregleda rizika",
                    )
            case.status = {"clear": "cleared", "approve": "approved", "reject": "rejected"}[action]
            case.resolved_at = datetime.now(UTC)
            if note:
                timestamp = datetime.now(UTC).isoformat(timespec="minutes")
                entry = f"[{timestamp}] {admin.username}: {note.strip()}"
                case.internal_notes = (
                    f"{case.internal_notes}\n{entry}".strip() if case.internal_notes else entry
                )
            resolved_action = {
                "clear": "cleared",
                "approve": "approved",
                "reject": "rejected",
            }[action]
            self.audit(admin, case, f"moderation_case.{resolved_action}", {"note": note})
        self.db.commit()
        return cases

    def get(self, case_id: str) -> ModerationCase:
        case = self.db.get(ModerationCase, case_id)
        if not case:
            raise api_error("NOT_FOUND", "Slučaj nije pronađen.", 404)
        return case

    def audit(
        self,
        admin: User,
        case: ModerationCase,
        action: str,
        metadata: dict | None = None,
    ) -> None:
        self.db.add(
            AuditLog(
                actor_user_id=admin.id,
                action=action,
                entity_type="moderation_case",
                entity_id=case.id,
                metadata_json=metadata or {},
            )
        )
