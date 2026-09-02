#!/usr/bin/env python3
"""Fail when a Brand Manager-managed application asset differs from its release receipt."""

from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path, PurePosixPath


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "docs/brand/managed-assets.json"
SHA256 = re.compile(r"^[0-9a-f]{64}$")


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(64 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def safe_destination(value: object) -> str | None:
    if not isinstance(value, str) or not value or "\\" in value:
        return None
    path = PurePosixPath(value)
    if path.is_absolute() or ".." in path.parts:
        return None
    return value


def validate(manifest_path: Path = MANIFEST_PATH, root: Path = ROOT) -> list[str]:
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        return [f"Cannot read brand asset manifest {manifest_path}: {error}"]

    if not isinstance(manifest, dict) or manifest.get("schema_version") != 1:
        return ["Brand asset manifest must use schema_version 1"]
    assets = manifest.get("assets")
    if not isinstance(assets, list) or not assets:
        return ["Brand asset manifest must contain at least one asset"]

    errors: list[str] = []
    seen: set[str] = set()
    for index, asset in enumerate(assets):
        if not isinstance(asset, dict):
            errors.append(f"assets[{index}] must be an object")
            continue
        destination = safe_destination(asset.get("destination"))
        expected = asset.get("sha256")
        if destination is None:
            errors.append(f"assets[{index}].destination must be a safe relative path")
            continue
        if destination in seen:
            errors.append(f"Duplicate managed destination: {destination}")
            continue
        seen.add(destination)
        if not isinstance(expected, str) or not SHA256.fullmatch(expected):
            errors.append(f"Invalid SHA-256 for managed asset: {destination}")
            continue

        path = root / destination
        if not path.is_file():
            errors.append(f"Managed brand asset is missing: {destination}")
            continue
        actual = file_sha256(path)
        if actual != expected:
            errors.append(
                f"Managed brand asset drifted: {destination} (expected {expected}, found {actual})"
            )
    return errors


def main() -> int:
    errors = validate()
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        print(
            "Synchronize from the canonical Brand Manager with `make brand-assets-sync`, "
            "then review and commit both the asset copies and manifest.",
            file=sys.stderr,
        )
        return 1
    print("Managed brand asset release check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
