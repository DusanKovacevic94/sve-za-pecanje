"""Test-only helpers for Playwright.

No HTTP route imports this module. It operates only on the isolated E2E
database and refuses to run unless APP_ENV=test.
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from urllib.parse import parse_qs, urlparse
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.email_outbox import EmailOutbox
from app.models.brand import Brand
from app.models.category import Category
from app.models.listing import Listing
from app.models.profile import UserProfile
from app.models.user import User
from app.tasks.analytics_tasks import refresh_marketplace_metrics, refresh_search_discovery
from app.tasks.email_tasks import process_email_outbox
from app.tasks.notification_tasks import delete_old_notifications
from app.services.account_service import process_data_exports

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


def seed_seo(db: Session) -> None:
    suffix = uuid4().hex[:8]
    category = Category(
        slug=f"e2e-seo-spin-stapovi-{suffix}",
        name_sr=f"E2E spin štapovi {suffix}",
        name_en=f"E2E spinning rods {suffix}",
        description_sr="Izolovana kategorija za E2E proveru SEO landing stranica.",
        sort_order=999,
        is_active=True,
    )
    brand = Brand(
        name=f"Shimano E2E {suffix}",
        slug=f"e2e-shimano-{suffix}",
        aliases=[],
        category_scope=[],
        is_verified=True,
    )
    seller = User(
        email=f"e2e-seo-seller-{suffix}@example.com",
        username=f"e2e_seo_seller_{suffix}",
        password_hash=hash_password("E2eSeoSeller123!"),
        role="user",
        status="active",
        email_verified_at=datetime.now(UTC),
    )
    seller.profile = UserProfile(display_name=f"E2E SEO prodavac {suffix}")
    db.add_all([category, brand, seller])
    db.flush()

    listings = []
    for index in range(5):
        listing = Listing(
            public_id=f"seo{suffix}{index}",
            seller_id=seller.id,
            category_id=category.id,
            brand_id=brand.id,
            title=f"E2E SEO Shimano spin štap {index + 1}",
            slug=f"e2e-seo-spin-stap-{suffix}-{index}",
            description=(
                "Detaljan E2E SEO opis aktivnog Shimano spin štapa "
                "sa stanjem, cenom i načinom dostave."
            ),
            condition="used_good",
            price_amount=Decimal(10000 + index * 1000),
            currency="RSD",
            delivery_methods=["courier"],
            city="Beograd",
            status="active",
            attributes={},
            allow_messages=True,
            phone_visible=False,
            approved_at=datetime.now(UTC),
            expires_at=datetime.now(UTC) + timedelta(days=30),
        )
        db.add(listing)
        listings.append(listing)
    db.commit()
    print(
        json.dumps(
            {
                "category_id": category.id,
                "category_slug": category.slug,
                "category_name": category.name_sr,
                "brand_id": brand.id,
                "brand_slug": brand.slug,
                "brand_name": brand.name,
                "listing_slug": listings[0].slug,
            }
        )
    )


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
        "search_discovery": refresh_search_discovery,
        "notification_retention": delete_old_notifications,
        "data_exports": process_data_exports,
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
    subparsers.add_parser("seed-seo")

    email_parser = subparsers.add_parser("email-token")
    email_parser.add_argument("recipient")

    task_parser = subparsers.add_parser("run-task")
    task_parser.add_argument("task_name")
    args = parser.parse_args()

    require_test_environment()
    with SessionLocal() as db:
        if args.command == "seed":
            seed(db)
        elif args.command == "seed-seo":
            seed_seo(db)
        elif args.command == "email-token":
            email_token(db, args.recipient)
        else:
            run_task(db, args.task_name)


if __name__ == "__main__":
    main()
