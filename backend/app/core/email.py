import logging

logger = logging.getLogger(__name__)


def send_email(to_email: str, subject: str, body: str) -> None:
    logger.info("email queued", extra={"to_email": to_email, "subject": subject})

