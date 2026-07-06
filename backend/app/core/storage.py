from pathlib import Path
from posixpath import join as join_storage_path
from uuid import uuid4

from fastapi import UploadFile
from PIL import Image, ImageOps

from app.core.config import settings
from app.core.responses import api_error

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
OUTPUT_CONTENT_TYPE = "image/webp"
OUTPUT_FILENAME = "original.webp"
CHUNK_SIZE = 1024 * 1024


def store_listing_image(public_id: str, upload: UploadFile) -> dict[str, object]:
    image_id, image_bytes, width, height = process_listing_image(upload)
    relative_key = f"listings/{public_id}/{image_id}/{OUTPUT_FILENAME}"

    if settings.use_s3_storage:
        return store_listing_image_s3(
            object_storage_key(relative_key),
            image_bytes,
            width,
            height,
            upload.filename or "upload",
        )

    return store_listing_image_local(
        public_id,
        image_id,
        relative_key,
        image_bytes,
        width,
        height,
        upload.filename or "upload",
    )


def process_listing_image(upload: UploadFile) -> tuple[str, bytes, int, int]:
    if upload.content_type not in ALLOWED_CONTENT_TYPES:
        raise api_error("INVALID_IMAGE_TYPE", "Dozvoljeni formati slika su JPG, PNG i WebP.", 400)

    max_size = settings.max_image_size_mb * 1024 * 1024
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = upload.file.read(CHUNK_SIZE)
        if not chunk:
            break
        total += len(chunk)
        if total > max_size:
            raise api_error("IMAGE_TOO_LARGE", f"Slika ne sme biti veća od {settings.max_image_size_mb} MB.", 400)
        chunks.append(chunk)
    raw = b"".join(chunks)

    image_id = str(uuid4())

    try:
        from io import BytesIO

        Image.open(BytesIO(raw)).verify()
        image = Image.open(BytesIO(raw))
        image = ImageOps.exif_transpose(image)
        if image.mode not in {"RGB", "RGBA"}:
            image = image.convert("RGB")
        image.thumbnail((1600, 1600))
        output = BytesIO()
        image.save(output, "WEBP", quality=86, exif=b"")
    except Exception as exc:
        raise api_error("INVALID_IMAGE_TYPE", "Slika nije ispravna.", 400) from exc

    return image_id, output.getvalue(), image.width, image.height


def store_listing_image_local(
    public_id: str,
    image_id: str,
    storage_key: str,
    image_bytes: bytes,
    width: int,
    height: int,
    original_filename: str,
) -> dict[str, object]:
    directory = Path(settings.local_storage_path) / "listings" / public_id / image_id
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / OUTPUT_FILENAME
    path.write_bytes(image_bytes)

    return {
        "storage_key": str(path),
        "url": f"/uploads/listings/{public_id}/{image_id}/original.webp",
        "content_type": OUTPUT_CONTENT_TYPE,
        "width": width,
        "height": height,
        "size_bytes": len(image_bytes),
        "original_filename": original_filename,
    }


def store_listing_image_s3(
    storage_key: str,
    image_bytes: bytes,
    width: int,
    height: int,
    original_filename: str,
) -> dict[str, object]:
    validate_s3_settings()

    try:
        import boto3
        from botocore.config import Config
        from botocore.exceptions import BotoCoreError, ClientError
    except ImportError as exc:
        raise api_error("STORAGE_NOT_CONFIGURED", "S3 podrška nije instalirana.", 500) from exc

    try:
        addressing_style = "path" if settings.hetzner_storage_force_path_style else "virtual"
        client = boto3.client(
            "s3",
            endpoint_url=settings.object_storage_endpoint,
            aws_access_key_id=settings.object_storage_access_key,
            aws_secret_access_key=settings.object_storage_secret_key,
            region_name=settings.object_storage_region,
            config=Config(s3={"addressing_style": addressing_style}),
        )
        put_kwargs = dict(
            Bucket=settings.object_storage_bucket,
            Key=storage_key,
            Body=image_bytes,
            ContentType=OUTPUT_CONTENT_TYPE,
            CacheControl="public, max-age=31536000, immutable",
        )
        if settings.hetzner_storage_acl:
            put_kwargs["ACL"] = settings.hetzner_storage_acl
        client.put_object(**put_kwargs)
    except (BotoCoreError, ClientError) as exc:
        raise api_error("STORAGE_UPLOAD_FAILED", "Slika nije sačuvana. Pokušajte ponovo.", 502) from exc

    public_base = settings.object_storage_public_url.rstrip("/")
    return {
        "storage_key": storage_key,
        "url": f"{public_base}/{storage_key}",
        "content_type": OUTPUT_CONTENT_TYPE,
        "width": width,
        "height": height,
        "size_bytes": len(image_bytes),
        "original_filename": original_filename,
    }


def validate_s3_settings() -> None:
    missing = [
        name
        for name, value in {
            "HETZNER_STORAGE_ENDPOINT": settings.object_storage_endpoint,
            "HETZNER_STORAGE_ACCESS_KEY": settings.object_storage_access_key,
            "HETZNER_STORAGE_SECRET_KEY": settings.object_storage_secret_key,
            "HETZNER_STORAGE_BUCKET": settings.object_storage_bucket,
            "HETZNER_STORAGE_PUBLIC_URL": settings.object_storage_public_url,
        }.items()
        if not value
    ]
    if missing:
        raise api_error(
            "STORAGE_NOT_CONFIGURED",
            "S3 skladište nije podešeno.",
            500,
            {"missing": missing},
        )


def object_storage_key(relative_key: str) -> str:
    root_folder = settings.object_storage_root_folder
    if not root_folder:
        return relative_key
    return join_storage_path(root_folder, relative_key)


def delete_storage_object(storage_key: str) -> None:
    if not storage_key:
        return
    if settings.use_s3_storage:
        delete_storage_object_s3(storage_key)
        return
    delete_storage_object_local(storage_key)


def delete_storage_object_local(storage_key: str) -> None:
    storage_root = Path(settings.local_storage_path).resolve()
    path = resolve_local_storage_path(storage_key)
    try:
        path.unlink(missing_ok=True)
        for parent in path.parents:
            if parent == storage_root:
                break
            try:
                parent.rmdir()
            except OSError:
                break
    except OSError:
        return


def resolve_local_storage_path(storage_key: str) -> Path:
    path = Path(storage_key)
    if path.is_absolute():
        return path
    if path.exists():
        return path.resolve()
    return (Path(settings.local_storage_path) / path).resolve()


def delete_storage_object_s3(storage_key: str) -> None:
    validate_s3_settings()
    try:
        import boto3
        from botocore.config import Config
        from botocore.exceptions import BotoCoreError, ClientError
    except ImportError:
        return

    try:
        addressing_style = "path" if settings.hetzner_storage_force_path_style else "virtual"
        client = boto3.client(
            "s3",
            endpoint_url=settings.object_storage_endpoint,
            aws_access_key_id=settings.object_storage_access_key,
            aws_secret_access_key=settings.object_storage_secret_key,
            region_name=settings.object_storage_region,
            config=Config(s3={"addressing_style": addressing_style}),
        )
        client.delete_object(Bucket=settings.object_storage_bucket, Key=storage_key)
    except (BotoCoreError, ClientError):
        return
