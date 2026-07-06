from datetime import UTC, datetime, timedelta
import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.email import send_email
from app.models.email_outbox import EmailOutbox

MAX_ATTEMPTS = 5
logger = logging.getLogger(__name__)


def process_email_outbox(db: Session, limit: int = 25) -> int:
    now = datetime.now(UTC)
    emails = db.scalars(
        select(EmailOutbox)
        .where(
            EmailOutbox.status == "pending",
            (EmailOutbox.next_attempt_at.is_(None)) | (EmailOutbox.next_attempt_at <= now),
        )
        .order_by(EmailOutbox.created_at.asc())
        .limit(limit)
    ).all()
    processed = 0
    for email in emails:
        if not settings.resend_api_key:
            if settings.app_env == "production":
                email.status = "failed"
                email.last_error = "RESEND_API_KEY is not configured in production."
                logger.error("email outbox blocked: RESEND_API_KEY missing", extra={"email_id": email.id})
            else:
                email.status = "skipped"
                email.last_error = "RESEND_API_KEY is not configured in this environment."
                logger.info("email outbox skipped without RESEND_API_KEY", extra={"email_id": email.id})
            processed += 1
            continue
        email.attempts += 1
        ok = send_email(email.to_email, email.subject, email.body, email.html)
        if ok:
            email.status = "sent"
            email.sent_at = now
            email.last_error = None
        elif email.attempts >= MAX_ATTEMPTS:
            email.status = "failed"
            email.last_error = "Email provider rejected the message or could not be reached."
        else:
            email.last_error = "Email provider rejected the message or could not be reached."
            email.next_attempt_at = now + timedelta(minutes=min(30, 2 ** email.attempts))
        processed += 1
    if processed:
        db.commit()
    return processed
