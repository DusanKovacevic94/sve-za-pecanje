from __future__ import annotations

import os
from uuid import uuid4

import boto3
import pytest
from botocore.config import Config
from botocore.exceptions import ClientError

from app.core import private_storage
from app.core.config import settings

MINIO_ENDPOINT = os.getenv("MINIO_TEST_ENDPOINT")
MINIO_ACCESS_KEY = os.getenv("MINIO_TEST_ACCESS_KEY")
MINIO_SECRET_KEY = os.getenv("MINIO_TEST_SECRET_KEY")

pytestmark = pytest.mark.skipif(
    not all((MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY)),
    reason="Set the MINIO_TEST_* variables to run the local MinIO storage test.",
)


def test_minio_private_export_encrypted_round_trip_and_delete(monkeypatch):
    bucket = f"szp-private-export-{uuid4().hex[:12]}"
    client = boto3.client(
        "s3",
        endpoint_url=MINIO_ENDPOINT,
        aws_access_key_id=MINIO_ACCESS_KEY,
        aws_secret_access_key=MINIO_SECRET_KEY,
        region_name="us-east-1",
        config=Config(s3={"addressing_style": "path"}),
    )
    client.create_bucket(Bucket=bucket)

    monkeypatch.setattr(settings, "storage_backend", "s3")
    monkeypatch.setattr(settings, "hetzner_storage_endpoint", "")
    monkeypatch.setattr(settings, "hetzner_storage_bucket", "")
    monkeypatch.setattr(settings, "hetzner_storage_access_key", "")
    monkeypatch.setattr(settings, "hetzner_storage_secret_key", "")
    monkeypatch.setattr(settings, "hetzner_storage_root_folder", "")
    monkeypatch.setattr(settings, "s3_endpoint_url", MINIO_ENDPOINT)
    monkeypatch.setattr(settings, "s3_bucket", bucket)
    monkeypatch.setattr(settings, "s3_access_key_id", MINIO_ACCESS_KEY)
    monkeypatch.setattr(settings, "s3_secret_access_key", MINIO_SECRET_KEY)
    monkeypatch.setattr(settings, "s3_region_name", "us-east-1")
    monkeypatch.setattr(settings, "hetzner_storage_force_path_style", True)

    key = f"exports/{uuid4().hex}.bin"
    plaintext = b"private account export"
    encrypted = private_storage.encrypt_export(plaintext)

    try:
        storage_key = private_storage.store_private_export(key, encrypted)
        stored = client.get_object(Bucket=bucket, Key=storage_key)["Body"].read()

        assert stored != plaintext
        assert private_storage.read_private_export(storage_key) == encrypted
        assert private_storage.decrypt_export(encrypted) == plaintext

        private_storage.delete_private_export(storage_key)
        with pytest.raises(ClientError) as raised:
            client.get_object(Bucket=bucket, Key=storage_key)
        assert raised.value.response["Error"]["Code"] in {"NoSuchKey", "404"}
    finally:
        for item in client.list_objects_v2(Bucket=bucket).get("Contents", []):
            client.delete_object(Bucket=bucket, Key=item["Key"])
        client.delete_bucket(Bucket=bucket)
