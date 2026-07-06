from pathlib import Path

from sqlalchemy import select

from app.core.config import settings
from app.core.storage import object_storage_key, resolve_local_storage_path, store_listing_image_s3
from app.db.session import SessionLocal
from app.models.image import ListingImage


def main() -> None:
    if not settings.use_s3_storage:
        raise SystemExit("Set STORAGE_BACKEND=s3 or STORAGE_BACKEND=hetzner before running this script.")

    local_root = Path(settings.local_storage_path).resolve()
    migrated = 0
    missing = 0

    with SessionLocal() as db:
        images = db.scalars(select(ListingImage).where(ListingImage.url.startswith("/uploads/"))).all()
        for image in images:
            local_path = resolve_local_storage_path(image.storage_key)
            if not local_path.exists():
                missing += 1
                continue

            relative_key = local_path.resolve().relative_to(local_root).as_posix()
            stored = store_listing_image_s3(
                object_storage_key(relative_key),
                local_path.read_bytes(),
                image.width or 0,
                image.height or 0,
                image.original_filename or local_path.name,
            )
            image.storage_key = str(stored["storage_key"])
            image.url = str(stored["url"])
            image.content_type = str(stored["content_type"])
            image.size_bytes = int(stored["size_bytes"])
            migrated += 1

        db.commit()

    print(f"migrated={migrated} missing={missing}")


if __name__ == "__main__":
    main()
