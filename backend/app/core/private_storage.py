from __future__ import annotations

import base64
import hashlib
from pathlib import Path

from botocore.exceptions import ClientError
from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings

_SSE_UNSUPPORTED_ERROR_CODES = frozenset(
    {"InvalidArgument", "NotImplemented", "XNotImplemented"}
)
_SSE_ARGUMENT_MARKERS = (
    "serversideencryption",
    "server-side encryption",
    "server side encryption",
    "x-amz-server-side-encryption",
)
_UNSUPPORTED_MARKERS = ("not implemented", "not supported", "unsupported")


def _cipher() -> Fernet:
    key = base64.urlsafe_b64encode(
        hashlib.sha256(f"account-export:{settings.secret_key}".encode()).digest()
    )
    return Fernet(key)


def encrypt_export(payload: bytes) -> bytes:
    return _cipher().encrypt(payload)


def decrypt_export(payload: bytes) -> bytes:
    try:
        return _cipher().decrypt(payload)
    except InvalidToken as error:
        raise ValueError("Export archive cannot be decrypted.") from error


def _s3_client():
    import boto3
    from botocore.config import Config

    addressing_style = "path" if settings.hetzner_storage_force_path_style else "virtual"
    return boto3.client(
        "s3",
        endpoint_url=settings.object_storage_endpoint,
        aws_access_key_id=settings.object_storage_access_key,
        aws_secret_access_key=settings.object_storage_secret_key,
        region_name=settings.object_storage_region,
        config=Config(s3={"addressing_style": addressing_style}),
    )


def _is_unsupported_sse_error(error: ClientError) -> bool:
    details = error.response.get("Error", {})
    code = str(details.get("Code", ""))
    description = " ".join(str(value) for value in details.values()).lower()
    return (
        code in _SSE_UNSUPPORTED_ERROR_CODES
        and any(marker in description for marker in _SSE_ARGUMENT_MARKERS)
        and (
            code in {"NotImplemented", "XNotImplemented"}
            or any(marker in description for marker in _UNSUPPORTED_MARKERS)
        )
    )


def store_private_export(key: str, payload: bytes) -> str:
    if settings.use_s3_storage:
        storage_key = (
            f"{settings.object_storage_root_folder}/{key}"
            if settings.object_storage_root_folder
            else key
        )
        client = _s3_client()
        put_kwargs = dict(
            Bucket=settings.object_storage_bucket,
            Key=storage_key,
            Body=payload,
            ContentType="application/octet-stream",
        )
        try:
            client.put_object(**put_kwargs, ServerSideEncryption="AES256")
        except ClientError as error:
            if not _is_unsupported_sse_error(error):
                raise
            client.put_object(**put_kwargs)
        return storage_key
    path = Path(settings.local_storage_path) / key
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(payload)
    path.chmod(0o600)
    return str(path)


def read_private_export(storage_key: str) -> bytes:
    if settings.use_s3_storage:
        response = _s3_client().get_object(
            Bucket=settings.object_storage_bucket,
            Key=storage_key,
        )
        return response["Body"].read()
    return Path(storage_key).read_bytes()


def delete_private_export(storage_key: str | None) -> None:
    if not storage_key:
        return
    if settings.use_s3_storage:
        _s3_client().delete_object(
            Bucket=settings.object_storage_bucket,
            Key=storage_key,
        )
    else:
        Path(storage_key).unlink(missing_ok=True)
