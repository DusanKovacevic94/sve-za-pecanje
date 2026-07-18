#!/usr/bin/env python3
"""Run non-mutating checks against an already deployed marketplace."""

from __future__ import annotations

import argparse
import html
import json
import sys
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


@dataclass(frozen=True)
class Check:
    name: str
    url: str
    contains: str | None = None
    json_response: bool = False


def fetch(check: Check, timeout: float) -> object:
    request = Request(
        check.url,
        headers={"Accept": "application/json,text/html", "User-Agent": "szp-post-deploy-smoke/1.0"},
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            body = response.read()
            status = response.status
            content_type = response.headers.get("Content-Type", "")
    except HTTPError as exc:
        detail = exc.read(300).decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code}: {detail}") from exc
    except URLError as exc:
        raise RuntimeError(str(exc.reason)) from exc

    if status < 200 or status >= 400:
        raise RuntimeError(f"unexpected HTTP {status}")
    if check.json_response:
        if "json" not in content_type:
            raise RuntimeError(f"expected JSON, received {content_type or 'unknown content type'}")
        try:
            return json.loads(body)
        except json.JSONDecodeError as exc:
            raise RuntimeError("response was not valid JSON") from exc
    if check.contains and check.contains.casefold() not in body.decode("utf-8", errors="replace").casefold():
        raise RuntimeError(f"response did not contain {check.contains!r}")
    return body


def normalized_url(value: str) -> str:
    return value.rstrip("/")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Check readiness and public pages without creating or changing data."
    )
    parser.add_argument("--app-url", required=True, help="Public frontend origin, for example https://svezapecanje.rs")
    parser.add_argument(
        "--api-url",
        help="Public API origin; defaults to --app-url when the same reverse proxy serves both",
    )
    parser.add_argument("--timeout", type=float, default=10.0, help="Per-request timeout in seconds")
    args = parser.parse_args()

    app_url = normalized_url(args.app_url)
    api_url = normalized_url(args.api_url or args.app_url)
    checks = [
        Check("readiness", f"{api_url}/health/ready", json_response=True),
        Check("homepage", f"{app_url}/", contains="Sve Za Pecanje"),
        Check("browse", f"{app_url}/oglasi", contains="Oglasi"),
        Check("login", f"{app_url}/prijava", contains="Prijavi se"),
        Check("listing API", f"{api_url}/api/v1/listings?page_size=1", json_response=True),
    ]

    listing_payload: object | None = None
    failed = False
    for check in checks:
        try:
            result = fetch(check, args.timeout)
            if check.name == "listing API":
                listing_payload = result
            print(f"PASS {check.name}: {check.url}")
        except RuntimeError as exc:
            failed = True
            print(f"FAIL {check.name}: {check.url} ({exc})", file=sys.stderr)

    if not failed:
        try:
            listings = listing_payload["data"]  # type: ignore[index]
            slug = listings[0]["slug"]
            detail = Check(
                "listing detail",
                f"{app_url}/oglasi/{quote(str(slug), safe='')}",
                contains=html.escape(str(listings[0]["title"])),
            )
            fetch(detail, args.timeout)
            print(f"PASS {detail.name}: {detail.url}")
        except (IndexError, KeyError, TypeError):
            failed = True
            print("FAIL listing detail: listing API returned no usable public listing", file=sys.stderr)
        except RuntimeError as exc:
            failed = True
            print(f"FAIL listing detail: {exc}", file=sys.stderr)

    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
