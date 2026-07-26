from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session

from app.core.responses import api_error
from app.models.audit import AuditLog
from app.models.conversation_safety import (
    ConversationPreference,
    ConversationReport,
    UserBlock,
)
from app.models.listing import Listing
from app.models.message import Conversation, Message
from app.models.moderation_case import ModerationCase
from app.models.notification import UserNotification
from app.models.report import Report
from app.models.user import User


REPORT_RISK = {
    "spam": 45,
    "harassment": 65,
    "scam": 80,
    "off_platform_payment": 70,
    "inappropriate_content": 60,
    "other": 40,
}


class ConversationSafetyService:
    def __init__(self, db: Session):
        self.db = db

    def is_blocked_between(self, first_user_id: str, second_user_id: str) -> bool:
        return (
            self.db.scalar(
                select(UserBlock.id).where(
                    or_(
                        (UserBlock.blocker_id == first_user_id)
                        & (UserBlock.blocked_id == second_user_id),
                        (UserBlock.blocker_id == second_user_id)
                        & (UserBlock.blocked_id == first_user_id),
                    )
                )
            )
            is not None
        )

    def blocked_by(self, blocker_id: str, blocked_id: str) -> bool:
        return (
            self.db.scalar(
                select(UserBlock.id).where(
                    UserBlock.blocker_id == blocker_id,
                    UserBlock.blocked_id == blocked_id,
                )
            )
            is not None
        )

    def is_available_between(self, first_user_id: str, second_user_id: str) -> bool:
        if self.is_blocked_between(first_user_id, second_user_id):
            return False
        statuses = list(
            self.db.scalars(
                select(User.status).where(
                    User.id.in_([first_user_id, second_user_id])
                )
            ).all()
        )
        return len(statuses) == 2 and all(
            status not in {"suspended", "deleted"} for status in statuses
        )

    def enforce_available(self, first_user_id: str, second_user_id: str) -> None:
        if not self.is_available_between(first_user_id, second_user_id):
            raise api_error(
                "conversation_unavailable",
                "Razgovor trenutno nije dostupan.",
                403,
            )

    def get_participant_conversation(
        self, conversation_id: str, user_id: str
    ) -> Conversation:
        conversation = self.db.get(Conversation, conversation_id)
        if not conversation:
            raise api_error("NOT_FOUND", "Razgovor nije pronađen.", 404)
        if user_id not in {conversation.buyer_id, conversation.seller_id}:
            raise api_error("FORBIDDEN", "Nemate pristup ovom razgovoru.", 403)
        return conversation

    @staticmethod
    def counterpart_id(conversation: Conversation, user_id: str) -> str:
        return (
            conversation.seller_id
            if user_id == conversation.buyer_id
            else conversation.buyer_id
        )

    def preference(
        self, conversation_id: str, user_id: str
    ) -> ConversationPreference | None:
        return self.db.scalar(
            select(ConversationPreference).where(
                ConversationPreference.conversation_id == conversation_id,
                ConversationPreference.user_id == user_id,
            )
        )

    def is_muted(self, conversation_id: str, user_id: str) -> bool:
        preference = self.preference(conversation_id, user_id)
        return bool(preference and preference.muted_at)

    def set_muted(
        self, conversation_id: str, user: User, muted: bool
    ) -> ConversationPreference:
        self.get_participant_conversation(conversation_id, user.id)
        preference = self.preference(conversation_id, user.id)
        if not preference:
            preference = ConversationPreference(
                conversation_id=conversation_id,
                user_id=user.id,
            )
            self.db.add(preference)
        preference.muted_at = datetime.now(UTC) if muted else None
        self.db.commit()
        self.db.refresh(preference)
        return preference

    def block(self, conversation_id: str, user: User) -> None:
        conversation = self.get_participant_conversation(conversation_id, user.id)
        counterpart_id = self.counterpart_id(conversation, user.id)
        if not self.blocked_by(user.id, counterpart_id):
            self.db.add(UserBlock(blocker_id=user.id, blocked_id=counterpart_id))
        self.db.execute(
            delete(UserNotification).where(
                or_(
                    (UserNotification.recipient_id == user.id)
                    & (UserNotification.actor_id == counterpart_id),
                    (UserNotification.recipient_id == counterpart_id)
                    & (UserNotification.actor_id == user.id),
                )
            )
        )
        self.db.commit()

    def unblock(self, conversation_id: str, user: User) -> None:
        conversation = self.get_participant_conversation(conversation_id, user.id)
        counterpart_id = self.counterpart_id(conversation, user.id)
        self.db.execute(
            delete(UserBlock).where(
                UserBlock.blocker_id == user.id,
                UserBlock.blocked_id == counterpart_id,
            )
        )
        self.db.commit()

    def report(
        self,
        conversation_id: str,
        user: User,
        *,
        reason: str,
        explanation: str | None,
        message_id: str | None,
    ) -> ConversationReport:
        conversation = self.get_participant_conversation(conversation_id, user.id)
        counterpart_id = self.counterpart_id(conversation, user.id)
        target_message = None
        if message_id:
            target_message = self.db.scalar(
                select(Message).where(
                    Message.id == message_id,
                    Message.conversation_id == conversation.id,
                )
            )
            if not target_message:
                raise api_error(
                    "VALIDATION_ERROR",
                    "Poruka ne pripada ovom razgovoru.",
                    422,
                )
            if target_message.sender_id == user.id:
                raise api_error(
                    "VALIDATION_ERROR",
                    "Ne možete prijaviti sopstvenu poruku.",
                    422,
                )

        snapshot = self._snapshot(conversation, counterpart_id, target_message)
        report = ConversationReport(
            conversation_id=conversation.id,
            message_id=target_message.id if target_message else None,
            reporter_id=user.id,
            reported_user_id=counterpart_id,
            reason=reason,
            explanation=(explanation or "").strip() or None,
            content_snapshot=snapshot,
        )
        self.db.add(report)
        self.db.flush()
        case = ModerationCase(
            entity_type="conversation_report",
            entity_id=report.id,
            subject_user_id=counterpart_id,
            risk_score=REPORT_RISK[reason],
            reason_codes=["conversation_report", f"conversation_report_{reason}"],
        )
        self.db.add(case)
        self.db.flush()
        report.moderation_case_id = case.id
        self.db.add(
            AuditLog(
                actor_user_id=user.id,
                action="conversation_report.created",
                entity_type="conversation_report",
                entity_id=report.id,
                metadata_json={
                    "moderation_case_id": case.id,
                    "reason": reason,
                    "message_level": bool(target_message),
                },
            )
        )
        self.db.commit()
        self.db.refresh(report)
        return report

    def _snapshot(
        self,
        conversation: Conversation,
        reported_user_id: str,
        target_message: Message | None,
    ) -> dict:
        listing = self.db.get(Listing, conversation.listing_id)
        reported_user = self.db.get(User, reported_user_id)
        messages = list(
            self.db.scalars(
                select(Message)
                .where(Message.conversation_id == conversation.id)
                .order_by(Message.created_at.desc())
                .limit(50)
            ).all()
        )
        prior_listing_reports = int(
            self.db.scalar(
                select(func.count(Report.id)).where(
                    Report.reported_user_id == reported_user_id
                )
            )
            or 0
        )
        prior_conversation_reports = int(
            self.db.scalar(
                select(func.count(ConversationReport.id)).where(
                    ConversationReport.reported_user_id == reported_user_id
                )
            )
            or 0
        )
        return {
            "captured_at": datetime.now(UTC).isoformat(),
            "conversation": {
                "id": conversation.id,
                "buyer_id": conversation.buyer_id,
                "seller_id": conversation.seller_id,
                "listing_id": conversation.listing_id,
            },
            "listing": (
                {
                    "id": listing.id,
                    "title": listing.title,
                    "slug": listing.slug,
                    "status": listing.status,
                    "seller_id": listing.seller_id,
                }
                if listing
                else None
            ),
            "reported_account": (
                {
                    "id": reported_user.id,
                    "username": reported_user.username,
                    "status": reported_user.status,
                    "created_at": reported_user.created_at.isoformat(),
                    "prior_listing_reports": prior_listing_reports,
                    "prior_conversation_reports": prior_conversation_reports,
                }
                if reported_user
                else None
            ),
            "target_message": self._message_snapshot(target_message),
            "recent_messages": [
                self._message_snapshot(message) for message in reversed(messages)
            ],
        }

    @staticmethod
    def _message_snapshot(message: Message | None) -> dict | None:
        if not message:
            return None
        return {
            "id": message.id,
            "sender_id": message.sender_id,
            "body": message.body,
            "created_at": message.created_at.isoformat(),
        }
