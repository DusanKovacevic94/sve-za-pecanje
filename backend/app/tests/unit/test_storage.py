from app.core import storage


def test_object_storage_key_uses_configured_root_folder(monkeypatch):
    monkeypatch.setattr(storage.settings, "hetzner_storage_root_folder", "/sve-za-pecanje/")

    assert (
        storage.object_storage_key("listings/public-id/image-id/original.webp")
        == "sve-za-pecanje/listings/public-id/image-id/original.webp"
    )


def test_object_storage_key_without_root_folder(monkeypatch):
    monkeypatch.setattr(storage.settings, "hetzner_storage_root_folder", "")

    assert (
        storage.object_storage_key("listings/public-id/image-id/original.webp")
        == "listings/public-id/image-id/original.webp"
    )
