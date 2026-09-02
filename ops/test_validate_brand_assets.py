from __future__ import annotations

import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "validate_brand_assets", ROOT / "ops" / "validate_brand_assets.py"
)
if SPEC is None or SPEC.loader is None:  # pragma: no cover
    raise RuntimeError("Could not load brand asset validator")
VALIDATOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(VALIDATOR)


class BrandAssetReleaseValidationTests(unittest.TestCase):
    def test_matching_asset_passes_and_drift_fails(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            asset = root / "frontend/public/brand/example.svg"
            asset.parent.mkdir(parents=True)
            asset.write_text("<svg/>", encoding="utf-8")
            digest = hashlib.sha256(asset.read_bytes()).hexdigest()
            manifest = root / "manifest.json"
            manifest.write_text(
                json.dumps(
                    {
                        "schema_version": 1,
                        "assets": [
                            {
                                "name": "Example",
                                "destination": "frontend/public/brand/example.svg",
                                "sha256": digest,
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )

            self.assertEqual([], VALIDATOR.validate(manifest, root))
            asset.write_text("drift", encoding="utf-8")
            self.assertIn("drifted", VALIDATOR.validate(manifest, root)[0])

    def test_manifest_cannot_escape_repository(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            manifest = root / "manifest.json"
            manifest.write_text(
                json.dumps(
                    {
                        "schema_version": 1,
                        "assets": [
                            {"name": "Unsafe", "destination": "../secret", "sha256": "0" * 64}
                        ],
                    }
                ),
                encoding="utf-8",
            )
            self.assertIn("safe relative path", VALIDATOR.validate(manifest, root)[0])


if __name__ == "__main__":
    unittest.main()
