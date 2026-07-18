import logging
import time
from datetime import UTC, datetime

from app.core.config import settings
from app.core.logging import configure_logging
from app.core.sentry import init_sentry
from app.db.session import SessionLocal
from app.tasks.analytics_tasks import (
    delete_old_analytics_events,
    flush_listing_view_counts,
    refresh_marketplace_metrics,
)
from app.tasks.email_tasks import process_email_outbox
from app.tasks.image_tasks import cleanup_orphan_local_uploads
from app.tasks.listing_tasks import archive_expired_listings, clear_expired_featured_listings
from app.tasks.notification_tasks import (
    send_listing_expiry_reminders,
    send_shop_subscription_expiry_reminders,
    send_unread_message_notifications,
)
from app.tasks.saved_search_tasks import send_saved_search_digests

logger = logging.getLogger(__name__)


def run_task(name: str, func) -> int:
    with SessionLocal() as db:
        try:
            count = func(db)
        except Exception:
            logger.exception("worker task failed", extra={"task": name})
            db.rollback()
            return 0
    logger.info("worker task finished", extra={"task": name, "count": count})
    return count


def run_cycle() -> None:
    run_task("email_outbox", process_email_outbox)
    run_task("flush_listing_view_counts", flush_listing_view_counts)
    run_task("refresh_marketplace_metrics", refresh_marketplace_metrics)
    run_task("archive_expired_listings", archive_expired_listings)
    run_task("clear_expired_featured_listings", clear_expired_featured_listings)
    run_task("saved_search_digests", send_saved_search_digests)
    run_task("delete_old_analytics_events", delete_old_analytics_events)
    run_task("cleanup_orphan_local_uploads", cleanup_orphan_local_uploads)
    run_task("send_unread_message_notifications", send_unread_message_notifications)
    run_task("send_listing_expiry_reminders", send_listing_expiry_reminders)
    run_task("send_shop_subscription_expiry_reminders", send_shop_subscription_expiry_reminders)


def write_heartbeat() -> None:
    try:
        import redis

        client = redis.Redis.from_url(settings.redis_url, socket_connect_timeout=1, socket_timeout=1)
        client.set(
            settings.worker_heartbeat_key,
            datetime.now(UTC).isoformat(),
            ex=settings.worker_heartbeat_max_age_seconds * 2,
        )
    except Exception:
        logger.warning("worker heartbeat write failed", exc_info=True)


def main() -> None:
    configure_logging()
    init_sentry()
    logger.info("worker started")
    while True:
        started = time.monotonic()
        run_cycle()
        write_heartbeat()
        elapsed = time.monotonic() - started
        logger.info("worker cycle finished", extra={"elapsed_seconds": round(elapsed, 3)})
        time.sleep(max(settings.worker_interval_seconds - elapsed, 1))


if __name__ == "__main__":
    main()
