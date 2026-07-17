from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Any

from sqlalchemy.orm import Session

from app.core.responses import api_error
from app.core.category_taxonomy import LEAF_BY_SLUG
from app.models.category import AttributeDefinition
from app.models.category import Category
from app.services.category_service import (
    effective_attribute_definitions,
    inject_leaf_discriminator,
)


def _is_missing(value: Any) -> bool:
    return value is None or value == "" or value == []


def condition_matches(attributes: dict[str, Any], condition: dict[str, Any] | None) -> bool:
    if not condition:
        return True
    for key, expected in condition.items():
        actual = attributes.get(key)
        allowed = expected if isinstance(expected, list) else [expected]
        actual_values = actual if isinstance(actual, list) else [actual]
        if not any(value in allowed for value in actual_values):
            return False
    return True


def _coerce(definition: AttributeDefinition, value: Any) -> Any:
    try:
        if definition.field_type == "integer":
            if isinstance(value, bool):
                raise ValueError
            return int(value)
        if definition.field_type == "decimal":
            if isinstance(value, bool):
                raise ValueError
            return float(Decimal(str(value).removesuffix(":1")))
        if definition.field_type == "boolean":
            if isinstance(value, bool):
                return value
            if isinstance(value, str) and value.lower() in {"true", "false"}:
                return value.lower() == "true"
            raise ValueError
        if definition.field_type == "multi_enum":
            values = value if isinstance(value, list) else [item.strip() for item in str(value).split(",")]
            return [str(item) for item in values if str(item)]
        return str(value).strip()
    except (ValueError, TypeError, InvalidOperation):
        raise api_error(
            "VALIDATION_ERROR",
            f"Polje „{definition.label_sr}” nema ispravnu vrednost.",
            422,
            {"field": definition.key},
        )


def validate_and_coerce_attributes(
    db: Session,
    category_id: str,
    attributes: dict[str, Any],
    *,
    enforce_required: bool = True,
) -> dict[str, Any]:
    category = db.get(Category, category_id)
    if not category:
        raise api_error("NOT_FOUND", "Kategorija nije pronađena.", 404)
    attributes = inject_leaf_discriminator(category, attributes)
    leaf = LEAF_BY_SLUG.get(category.slug)
    if (
        leaf
        and attributes.get(leaf["discriminator_key"]) not in leaf["discriminator_values"]
    ):
        raise api_error(
            "VALIDATION_ERROR",
            "Tip proizvoda ne odgovara izabranoj potkategoriji.",
            422,
            {"field": leaf["discriminator_key"]},
        )
    definitions = effective_attribute_definitions(db, category)
    by_key = {definition.key: definition for definition in definitions}
    unknown = sorted(set(attributes) - set(by_key))
    if unknown:
        raise api_error(
            "VALIDATION_ERROR",
            "Prosleđeni su nepoznati atributi kategorije.",
            422,
            {"fields": unknown},
        )

    result: dict[str, Any] = {}
    missing: list[str] = []
    for definition in definitions:
        raw = attributes.get(definition.key)
        rules = definition.validation or {}
        if not condition_matches(attributes, rules.get("visible_when")):
            continue
        conditionally_required = condition_matches(attributes, rules.get("required_when"))
        has_required_condition = bool(rules.get("required_when"))
        if _is_missing(raw):
            if enforce_required and (
                definition.required
                or (has_required_condition and conditionally_required)
            ):
                missing.append(definition.label_sr)
            continue
        value = _coerce(definition, raw)
        choices = {
            str(option.get("value"))
            for option in definition.options.get("options", [])
            if option.get("value") is not None
        }
        selected = value if isinstance(value, list) else [value]
        if choices and any(str(item) not in choices for item in selected):
            raise api_error(
                "VALIDATION_ERROR",
                f"Polje „{definition.label_sr}” sadrži nedozvoljenu vrednost.",
                422,
                {"field": definition.key},
            )
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            if rules.get("min") is not None and value < rules["min"]:
                raise api_error("VALIDATION_ERROR", f"Polje „{definition.label_sr}” je premalo.", 422)
            if rules.get("max") is not None and value > rules["max"]:
                raise api_error("VALIDATION_ERROR", f"Polje „{definition.label_sr}” je preveliko.", 422)
        result[definition.key] = value
    if missing:
        raise api_error(
            "VALIDATION_ERROR",
            "Nedostaju obavezna polja.",
            422,
            {"missing": missing},
        )
    return result
