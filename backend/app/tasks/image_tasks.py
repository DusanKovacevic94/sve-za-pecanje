import logging
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.image import ListingImage

logger = logging.getLogger(__name__)


def cleanup_orphan_local_uploads(db: Session) -> int:
    if settings.use_s3_storage:
        return 0

    root = Path(settings.local_storage_path)
    if not root.exists():
        return 0

    known = {Path(path).resolve() for path in db.scalars(select(ListingImage.storage_key)).all()}
    deleted = 0
    for path in root.rglob("*"):
        if not path.is_file() or path.resolve() in known:
            continue
        try:
            path.unlink()
            deleted += 1
        except OSError:
            logger.warning("orphan upload delete failed", extra={"path": str(path)}, exc_info=True)
    return deleted
