"""Test-only helpers for Playwright.

No HTTP route imports this module. It operates only on the isolated E2E
database and refuses to run unless APP_ENV=test.
"""

from __future__ import annotations

import argparse
import re
from datetime import UTC, datetime
from urllib.parse import parse_qs, urlparse

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.email_outbox import EmailOutbox
from app.models.profile import UserProfile
from app.models.user import User
from app.tasks.analytics_tasks import refresh_marketplace_metrics
from app.tasks.email_tasks import process_email_outbox

ADMIN_EMAIL = "e2e-admin@example.com"
ADMIN_USERNAME = "e2e_admin"
ADMIN_PASSWORD = "E2eAdmin123!"


def require_test_environment() -> None:
    if settings.app_env != "test":
        raise SystemExit("E2E support is available only when APP_ENV=test.")


def seed(db: Session) -> None:
    admin = db.scalar(select(User).where(User.email == ADMIN_EMAIL))
    if admin is None:
        admin = User(
            email=ADMIN_EMAIL,
            username=ADMIN_USERNAME,
            password_hash=hash_password(ADMIN_PASSWORD),
            role="admin",
            status="active",
            email_verified_at=datetime.now(UTC),
        )
        admin.profile = UserProfile(display_name="E2E administrator")
        db.add(admin)
    else:
        admin.username = ADMIN_USERNAME
        admin.password_hash = hash_password(ADMIN_PASSWORD)
        admin.role = "admin"
        admin.status = "active"
        admin.email_verified_at = admin.email_verified_at or datetime.now(UTC)
        if admin.profile:
            admin.profile.display_name = "E2E administrator"
        else:
            admin.profile = UserProfile(display_name="E2E administrator")

    db.commit()
    print(ADMIN_EMAIL)


def email_token(db: Session, recipient: str) -> None:
    message = db.scalar(
        select(EmailOutbox)
        .where(EmailOutbox.to_email == recipient)
        .order_by(EmailOutbox.created_at.desc())
    )
    if message is None:
        raise SystemExit(f"No queued email found for {recipient}.")

    match = re.search(r"https?://\S+", message.body)
    if match is None:
        raise SystemExit(f"Queued email for {recipient} contains no URL.")

    token = parse_qs(urlparse(match.group(0)).query).get("token", [None])[0]
    if not token:
        raise SystemExit(f"Queued email for {recipient} contains no token.")
    print(token)


def run_task(db: Session, task_name: str) -> None:
    tasks = {
        "email_outbox": process_email_outbox,
        "marketplace_metrics": refresh_marketplace_metrics,
    }
    task = tasks.get(task_name)
    if task is None:
        allowed = ", ".join(sorted(tasks))
        raise SystemExit(f"Unknown task {task_name!r}. Allowed tasks: {allowed}.")
    print(task(db))


def main() -> None:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("seed")

    email_parser = subparsers.add_parser("email-token")
    email_parser.add_argument("recipient")

    task_parser = subparsers.add_parser("run-task")
    task_parser.add_argument("task_name")
    args = parser.parse_args()

    require_test_environment()
    with SessionLocal() as db:
        if args.command == "seed":
            seed(db)
        elif args.command == "email-token":
            email_token(db, args.recipient)
        else:
            run_task(db, args.task_name)


if __name__ == "__main__":
    main()
