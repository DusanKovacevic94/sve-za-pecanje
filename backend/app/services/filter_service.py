from __future__ import annotations

import re
from datetime import UTC, datetime, timedelta
from decimal import Decimal, InvalidOperation
from typing import Any, Mapping

from sqlalchemy import Numeric, Select, String, and_, cast, or_, select
from sqlalchemy.orm import Session

from app.core.responses import api_error
from app.core.category_taxonomy import LEAF_BY_SLUG
from app.models.brand import Brand
from app.models.category import Category
from app.models.listing import Listing
from app.models.profile import UserProfile
from app.services.category_service import effective_attribute_definitions
from app.services.attribute_service import condition_matches
from app.services.search_utils import apply_listing_search

RANGE_PATTERN = re.compile(r"^attributes\[([^\]]+)\]\[(min|max)\]$")
EXACT_PATTERN = re.compile(r"^attributes\[([^\]]+)\]$")


def parse_query_params(query_params) -> dict[str, Any]:
    parsed: dict[str, Any] = {}
    for key in query_params.keys():
        values = query_params.getlist(key)
        parsed[key] = values if len(values) > 1 else values[0]
    return parsed


def _values(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value if str(item)]
    if value is None or value == "":
        return []
    return [str(value)]


def _number(value: Any, label: str) -> Decimal:
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        raise api_error("VALIDATION_ERROR", f"Filter „{label}” nije ispravan broj.", 422)


def _attribute_filters(filters: Mapping[str, Any]) -> tuple[dict[str, list[str]], dict[str, dict[str, str]]]:
    exact: dict[str, list[str]] = {}
    ranges: dict[str, dict[str, str]] = {}
    for key, value in filters.items():
        range_match = RANGE_PATTERN.match(key)
        if range_match and value not in (None, ""):
            ranges.setdefault(range_match.group(1), {})[range_match.group(2)] = str(value)
            continue
        exact_match = EXACT_PATTERN.match(key)
        if exact_match:
            values = _values(value)
            if values:
                exact[exact_match.group(1)] = values
    return exact, ranges


def apply_listing_filters(
    db: Session,
    statement: Select,
    filters: Mapping[str, Any],
) -> tuple[Select, Any | None]:
    rank = None
    query = str(filters.get("q") or "").strip()
    if query:
        dialect = db.bind.dialect.name if db.bind is not None else "sqlite"
        statement = statement.outerjoin(Brand, Listing.brand_id == Brand.id)
        statement, rank = apply_listing_search(statement, query, dialect, include_brand=True)

    category_slug = str(filters.get("category") or "")
    category = None
    if category_slug:
        category = db.scalar(select(Category).where(Category.slug == category_slug))
        if not category:
            raise api_error("NOT_FOUND", "Kategorija nije pronađena.", 404)
        descendant_ids = list(
            db.scalars(select(Category.id).where(Category.parent_id == category.id)).all()
        )
        statement = statement.where(
            Listing.category_id.in_([category.id, *descendant_ids])
        )
    for key in ("condition", "currency", "city", "brand_id"):
        values = _values(filters.get(key))
        if values:
            statement = statement.where(getattr(Listing, key).in_(values))
    if filters.get("price_min") not in (None, ""):
        statement = statement.where(Listing.price_amount >= _number(filters["price_min"], "Cena od"))
    if filters.get("price_max") not in (None, ""):
        statement = statement.where(Listing.price_amount <= _number(filters["price_max"], "Cena do"))
    if str(filters.get("with_images", "")).lower() == "true":
        statement = statement.where(Listing.images.any())
    if filters.get("seller_type") == "shop":
        statement = statement.join(UserProfile, UserProfile.user_id == Listing.seller_id).where(
            UserProfile.shop_active_until > datetime.now(UTC)
        )
    elif filters.get("seller_type") == "private":
        statement = statement.outerjoin(
            UserProfile, UserProfile.user_id == Listing.seller_id
        ).where(
            or_(
                UserProfile.shop_active_until.is_(None),
                UserProfile.shop_active_until <= datetime.now(UTC),
            )
        )
    posted_days = {"24h": 1, "7d": 7, "30d": 30}.get(str(filters.get("posted_within")))
    if posted_days:
        statement = statement.where(Listing.created_at >= datetime.now(UTC) - timedelta(days=posted_days))

    exact, ranges = _attribute_filters(filters)
    if not exact and not ranges:
        return statement, rank
    if not category_slug:
        raise api_error(
            "VALIDATION_ERROR",
            "Izaberite kategoriju pre korišćenja specifičnih filtera.",
            422,
        )
    assert category is not None
    definitions = {
        item.key: item for item in effective_attribute_definitions(db, category)
    }
    # Categories created before the catalog existed may temporarily have no
    # definitions. Keep their old exact/range URLs working until the catalog
    # migration or seed backfills them.
    if not definitions:
        for key, selected in exact.items():
            statement = statement.where(Listing.attributes[key].as_string().in_(selected))
        for key, bounds in ranges.items():
            numeric = cast(Listing.attributes[key].as_string(), Numeric)
            if "min" in bounds:
                statement = statement.where(numeric >= _number(bounds["min"], key))
            if "max" in bounds:
                statement = statement.where(numeric <= _number(bounds["max"], key))
        return statement, rank

    filter_context: dict[str, Any] = dict(exact)
    leaf = LEAF_BY_SLUG.get(category.slug)
    if leaf and len(leaf["discriminator_values"]) == 1:
        filter_context[leaf["discriminator_key"]] = [
            leaf["discriminator_values"][0]
        ]
    for key in set(exact) | set(ranges):
        definition = definitions.get(key)
        if not definition or not definition.filterable:
            raise api_error("VALIDATION_ERROR", f"Filter „{key}” nije dozvoljen.", 422)
        rules = definition.validation or {}
        if not condition_matches(filter_context, rules.get("visible_when")):
            raise api_error(
                "VALIDATION_ERROR",
                f"Filter „{definition.label_sr}” nije primenljiv za izabrani tip.",
                422,
            )
        choices = {
            str(option.get("value"))
            for option in definition.options.get("options", [])
            if option.get("value") is not None
        }
        if key in exact:
            selected = exact[key]
            if choices and any(value not in choices for value in selected):
                raise api_error(
                    "VALIDATION_ERROR",
                    f"Filter „{definition.label_sr}” sadrži nedozvoljenu vrednost.",
                    422,
                )
            json_value = Listing.attributes[key]
            if definition.field_type == "boolean":
                booleans = []
                for value in selected:
                    if value.lower() not in {"true", "false"}:
                        raise api_error("VALIDATION_ERROR", f"Filter „{definition.label_sr}” nije ispravan.", 422)
                    booleans.append(value.lower() == "true")
                statement = statement.where(json_value.as_boolean().in_(booleans))
            elif definition.field_type == "multi_enum":
                dialect = db.bind.dialect.name if db.bind is not None else "sqlite"
                if dialect == "postgresql":
                    statement = statement.where(
                        or_(*(Listing.attributes[key].contains([value]) for value in selected))
                    )
                else:
                    predicates = [
                        cast(Listing.attributes[key], String).contains(f'"{value}"')
                        for value in selected
                    ]
                    statement = statement.where(or_(*predicates))
            else:
                statement = statement.where(json_value.as_string().in_(selected))
        if key in ranges:
            if definition.field_type not in {"integer", "decimal"}:
                raise api_error(
                    "VALIDATION_ERROR",
                    f"Filter „{definition.label_sr}” ne podržava opseg.",
                    422,
                )
            numeric = cast(Listing.attributes[key].as_string(), Numeric)
            bounds = ranges[key]
            minimum = _number(bounds["min"], definition.label_sr) if "min" in bounds else None
            maximum = _number(bounds["max"], definition.label_sr) if "max" in bounds else None
            if minimum is not None and maximum is not None and minimum > maximum:
                raise api_error(
                    "VALIDATION_ERROR",
                    f"Donja granica filtera „{definition.label_sr}” mora biti manja od gornje.",
                    422,
                )
            if minimum is not None and rules.get("min") is not None and minimum < Decimal(str(rules["min"])):
                raise api_error("VALIDATION_ERROR", f"Filter „{definition.label_sr}” je ispod dozvoljenog opsega.", 422)
            if maximum is not None and rules.get("max") is not None and maximum > Decimal(str(rules["max"])):
                raise api_error("VALIDATION_ERROR", f"Filter „{definition.label_sr}” je iznad dozvoljenog opsega.", 422)
            predicates = []
            if rules.get("filter_mode") == "interval" and rules.get("interval_end"):
                interval_end = cast(
                    Listing.attributes[str(rules["interval_end"])].as_string(), Numeric
                )
                if minimum is not None:
                    predicates.append(interval_end >= minimum)
                if maximum is not None:
                    predicates.append(numeric <= maximum)
            else:
                if minimum is not None:
                    predicates.append(numeric >= minimum)
                if maximum is not None:
                    predicates.append(numeric <= maximum)
            statement = statement.where(and_(*predicates))
    return statement, rank
