from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.responses import api_error
from app.models.audit import AuditLog
from app.models.listing import PUBLIC_LISTING_STATUSES, Listing
from app.models.message import Message
from app.models.report import Report
from app.models.email_outbox import EmailOutbox
from app.models.user import User
from app.services.email_service import EmailService
from app.services.analytics_service import AnalyticsService
from app.services.notification_service import NotificationService


class ModerationService:
    def __init__(self, db: Session):
        self.db = db

    def dashboard(self) -> dict:
        seven_days_ago = datetime.now(UTC) - timedelta(days=7)
        return {
            "pending_listings": self.db.scalar(
                select(func.count(Listing.id)).where(Listing.status == "pending_review")
            )
            or 0,
            "active_listings": self.db.scalar(
                select(func.count(Listing.id)).where(
                    Listing.status.in_(PUBLIC_LISTING_STATUSES)
                )
            )
            or 0,
            "new_users_last_7_days": self.db.scalar(
                select(func.count(User.id)).where(User.created_at >= seven_days_ago)
            )
            or 0,
            "unresolved_reports": self.db.scalar(
                select(func.count(Report.id)).where(Report.status.in_(["open", "reviewing"]))
            )
            or 0,
            "messages_last_7_days": self.db.scalar(
                select(func.count(Message.id)).where(Message.created_at >= seven_days_ago)
            )
            or 0,
            "listings_last_7_days": self.db.scalar(
                select(func.count(Listing.id)).where(
                    Listing.created_at >= seven_days_ago,
                    Listing.status != "draft",
                )
            )
            or 0,
            "failed_emails": self.db.scalar(select(func.count(EmailOutbox.id)).where(EmailOutbox.status == "failed"))
            or 0,
        }

    def approve_listing(self, listing_id: str, admin: User) -> Listing:
        listing = self._get_listing(listing_id)
        if listing.status == "draft":
            raise api_error("VALIDATION_ERROR", "Nacrt prvo mora biti objavljen.", 400)
        listing.status = "active"
        listing.approved_at = datetime.now(UTC)
        listing.approved_by_admin_id = admin.id
        listing.rejection_reason = None
        self.audit(admin, "listing.approved", "listing", listing.id)
        AnalyticsService(self.db).track(
            "listing_approved",
            admin.id,
            {"review_mode": "manual"},
            entity_type="listing",
            entity_id=listing.id,
            category_id=listing.category_id,
        )
        EmailService(self.db).send_listing_approved(listing.seller.email, listing.title)
        NotificationService(self.db).create(
            recipient_id=listing.seller_id,
            type_="listing_approved",
            deduplication_key=f"listing-approved:{listing.id}",
            actor_id=admin.id,
            entity_type="listing",
            entity_id=listing.id,
            payload={
                "title": "Oglas je odobren",
                "body": f'Vaš oglas „{listing.title}” je objavljen.',
            },
            event_id=f"approved:{listing.id}:{listing.approved_at.isoformat()}",
        )
        self.db.commit()
        self.db.refresh(listing)
        return listing

    def reject_listing(self, listing_id: str, admin: User, reason: str) -> Listing:
        listing = self._get_listing(listing_id)
        if listing.status == "draft":
            raise api_error("VALIDATION_ERROR", "Nacrt prvo mora biti objavljen.", 400)
        rejected_at = datetime.now(UTC)
        listing.status = "rejected"
        listing.rejection_reason = reason
        self.audit(
            admin,
            "listing.rejected",
            "listing",
            listing.id,
            {"reason": reason, "seller_id": listing.seller_id},
        )
        EmailService(self.db).send_listing_rejected(listing.seller.email, listing.title, reason)
        NotificationService(self.db).create(
            recipient_id=listing.seller_id,
            type_="listing_rejected",
            deduplication_key=f"listing-rejected:{listing.id}",
            actor_id=admin.id,
            entity_type="listing",
            entity_id=listing.id,
            payload={
                "title": "Oglas nije odobren",
                "body": f'Pregledajte potrebne izmene za oglas „{listing.title}”.',
            },
            event_id=f"rejected:{listing.id}:{rejected_at.isoformat()}",
            consolidate=True,
        )
        self.db.commit()
        self.db.refresh(listing)
        from app.services.risk_service import RiskService

        RiskService(self.db).record_rejection_history(listing)
        return listing

    def feature_listing(self, listing_id: str, admin: User, featured_until: datetime) -> Listing:
        listing = self._get_listing(listing_id)
        if listing.status == "draft":
            raise api_error("VALIDATION_ERROR", "Nacrt prvo mora biti objavljen.", 400)
        listing.is_featured = True
        listing.featured_until = featured_until
        self.audit(admin, "listing.featured", "listing", listing.id)
        self.db.commit()
        self.db.refresh(listing)
        return listing

    def suspend_user(self, user_id: str, admin: User, reason: str) -> User:
        user = self.db.get(User, user_id)
        if not user:
            raise api_error("NOT_FOUND", "Korisnik nije pronađen.", 404)
        user.status = "suspended"
        archived = self.db.scalars(
            select(Listing).where(
                Listing.seller_id == user.id,
                Listing.status.in_(PUBLIC_LISTING_STATUSES),
            )
        ).all()
        for listing in archived:
            listing.status = "archived"
            listing.reserved_at = None
            listing.reserved_by_user_id = None
        self.audit(
            admin,
            "user.suspended",
            "user",
            user.id,
            {"reason": reason, "archived_listing_ids": [listing.id for listing in archived]},
        )
        self.db.commit()
        self.db.refresh(user)
        return user

    def unsuspend_user(self, user_id: str, admin: User) -> User:
        user = self.db.get(User, user_id)
        if not user:
            raise api_error("NOT_FOUND", "Korisnik nije pronađen.", 404)
        user.status = "active"
        self.audit(
            admin,
            "user.unsuspended",
            "user",
            user.id,
            {"restore_policy": "archived listings are not restored automatically"},
        )
        self.db.commit()
        self.db.refresh(user)
        return user

    def resolve_report(self, report_id: str, admin: User, status: str, note: str | None) -> Report:
        report = self.db.get(Report, report_id)
        if not report:
            raise api_error("NOT_FOUND", "Prijava nije pronađena.", 404)
        if status not in {"resolved", "dismissed"}:
            raise api_error("VALIDATION_ERROR", "Status prijave mora biti resolved ili dismissed.", 422)
        report.status = status
        report.resolution_note = note
        report.resolved_by_admin_id = admin.id
        report.resolved_at = datetime.now(UTC)
        self.audit(admin, "report.resolved", "report", report.id, {"status": status})
        self.db.commit()
        self.db.refresh(report)
        return report

    def audit(
        self,
        admin: User,
        action: str,
        entity_type: str,
        entity_id: str,
        metadata: dict | None = None,
    ) -> None:
        self.db.add(
            AuditLog(
                actor_user_id=admin.id,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                metadata_json=metadata or {},
            )
        )

    def _get_listing(self, listing_id: str) -> Listing:
        listing = self.db.get(Listing, listing_id)
        if not listing:
            raise api_error("NOT_FOUND", "Oglas nije pronađen.", 404)
        return listing
