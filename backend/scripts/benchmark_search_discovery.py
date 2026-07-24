"""Measure search suggestion latency against a representative database."""

from __future__ import annotations

import argparse
import json
from statistics import median
from time import perf_counter

from sqlalchemy import func, select

from app.db.session import SessionLocal
from app.models.listing import PUBLIC_LISTING_STATUSES, Listing
from app.services.search_discovery_service import SearchDiscoveryService

DEFAULT_TERMS = ("shim", "masin", "feeder", "varal", "daiwa", "stap")


def percentile(values: list[float], percentile_value: float) -> float:
    ordered = sorted(values)
    index = min(int(round((len(ordered) - 1) * percentile_value)), len(ordered) - 1)
    return ordered[index]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--iterations", type=int, default=20)
    parser.add_argument("--minimum-listings", type=int, default=10_000)
    parser.add_argument("--budget-ms", type=float, default=150.0)
    parser.add_argument("--allow-small-dataset", action="store_true")
    args = parser.parse_args()

    with SessionLocal() as db:
        listing_count = int(
            db.scalar(
                select(func.count(Listing.id)).where(
                    Listing.status.in_(PUBLIC_LISTING_STATUSES)
                )
            )
            or 0
        )
        if listing_count < args.minimum_listings and not args.allow_small_dataset:
            raise SystemExit(
                f"Dataset has {listing_count} public listings; "
                f"{args.minimum_listings} are required."
            )
        service = SearchDiscoveryService(db)
        durations: list[float] = []
        for iteration in range(args.iterations):
            for term in DEFAULT_TERMS:
                started = perf_counter()
                service.suggestions(term, limit=10)
                durations.append((perf_counter() - started) * 1000)
                if iteration == 0:
                    db.expire_all()
        result = {
            "public_listings": listing_count,
            "samples": len(durations),
            "median_ms": round(median(durations), 2),
            "p95_ms": round(percentile(durations, 0.95), 2),
            "budget_ms": args.budget_ms,
        }
        print(json.dumps(result, indent=2))
        if result["p95_ms"] > args.budget_ms:
            raise SystemExit("Search suggestion latency exceeded the p95 budget.")


if __name__ == "__main__":
    main()
