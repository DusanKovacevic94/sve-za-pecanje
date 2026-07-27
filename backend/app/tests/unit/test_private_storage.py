from __future__ import annotations

import pytest
from botocore.exceptions import ClientError

from app.core import private_storage
from app.core.config import settings


class RejectingStorageClient:
    def __init__(self, error: ClientError):
        self.error = error
        self.put_calls: list[dict] = []

    def put_object(self, **kwargs):
        self.put_calls.append(kwargs)
        if "ServerSideEncryption" in kwargs:
            raise self.error


def _client_error(code: str, message: str, **details: str) -> ClientError:
    return ClientError(
        {"Error": {"Code": code, "Message": message, **details}},
        "PutObject",
    )


@pytest.mark.parametrize(
    "error",
    [
        _client_error(
            "InvalidArgument",
            "The x-amz-server-side-encryption header is unsupported",
        ),
        _client_error(
            "NotImplemented",
            "Server-side encryption is not implemented",
        ),
        _client_error(
            "NotImplemented",
            "Server side encryption specified but KMS is not configured",
        ),
        _client_error(
            "XNotImplemented",
            "Unsupported argument",
            ArgumentName="ServerSideEncryption",
        ),
    ],
)
def test_private_export_retries_without_sse_only_when_provider_rejects_sse(
    monkeypatch, error
):
    client = RejectingStorageClient(error)
    monkeypatch.setattr(settings, "storage_backend", "s3")
    monkeypatch.setattr(private_storage, "_s3_client", lambda: client)

    storage_key = private_storage.store_private_export(
        "exports/retry.bin",
        b"encrypted",
    )

    assert storage_key.endswith("exports/retry.bin")
    assert len(client.put_calls) == 2
    assert client.put_calls[0]["ServerSideEncryption"] == "AES256"
    assert "ServerSideEncryption" not in client.put_calls[1]


@pytest.mark.parametrize(
    "error",
    [
        _client_error("AccessDenied", "Access denied"),
        _client_error("InvalidAccessKeyId", "Unknown access key"),
        _client_error("SignatureDoesNotMatch", "Invalid signature"),
        _client_error("InvalidArgument", "The bucket name is invalid"),
        _client_error("NotImplemented", "Object locking is not implemented"),
    ],
)
def test_private_export_does_not_swallow_unrelated_provider_errors(
    monkeypatch, error
):
    client = RejectingStorageClient(error)
    monkeypatch.setattr(settings, "storage_backend", "s3")
    monkeypatch.setattr(private_storage, "_s3_client", lambda: client)

    with pytest.raises(ClientError) as raised:
        private_storage.store_private_export("exports/fail.bin", b"encrypted")

    assert raised.value is error
    assert len(client.put_calls) == 1
