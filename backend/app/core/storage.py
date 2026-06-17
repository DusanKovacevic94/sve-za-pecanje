from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile
from PIL import Image

from app.core.config import settings
from app.core.responses import api_error

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


def store_listing_image(public_id: str, upload: UploadFile) -> dict[str, object]:
    if upload.content_type not in ALLOWED_CONTENT_TYPES:
        raise api_error("INVALID_IMAGE_TYPE", "Dozvoljeni formati slika su JPG, PNG i WebP.", 400)

    raw = upload.file.read()
    if len(raw) > settings.max_image_size_mb * 1024 * 1024:
        raise api_error(
            "IMAGE_TOO_LARGE",
            f"Slika ne sme biti veća od {settings.max_image_size_mb} MB.",
            400,
        )

    image_id = str(uuid4())
    directory = Path(settings.local_storage_path) / "listings" / public_id / image_id
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / "original.webp"

    try:
        from io import BytesIO

        image = Image.open(BytesIO(raw))
        image.thumbnail((1600, 1600))
        image.save(path, "WEBP", quality=86)
    except Exception as exc:
        raise api_error("INVALID_IMAGE_TYPE", "Slika nije ispravna.", 400) from exc

    return {
        "storage_key": str(path),
        "url": f"/uploads/listings/{public_id}/{image_id}/original.webp",
        "content_type": "image/webp",
        "width": image.width,
        "height": image.height,
        "size_bytes": path.stat().st_size,
        "original_filename": upload.filename or "upload",
    }

