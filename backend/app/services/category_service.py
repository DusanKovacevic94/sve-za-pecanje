from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.category_taxonomy import LEAF_BY_SLUG
from app.models.category import AttributeDefinition, Category


def effective_attribute_definitions(
    db: Session,
    category: Category,
    *,
    hide_redundant_discriminator: bool = False,
) -> list[AttributeDefinition]:
    category_ids = [category.id]
    if category.parent_id:
        category_ids.insert(0, category.parent_id)
    rows = list(
        db.scalars(
            select(AttributeDefinition)
            .where(AttributeDefinition.category_id.in_(category_ids))
            .order_by(AttributeDefinition.sort_order)
        ).all()
    )
    by_key: dict[str, AttributeDefinition] = {}
    for definition in rows:
        by_key[definition.key] = definition
    definitions = list(by_key.values())
    leaf = LEAF_BY_SLUG.get(category.slug)
    if (
        hide_redundant_discriminator
        and leaf
        and len(leaf["discriminator_values"]) == 1
    ):
        definitions = [
            item for item in definitions if item.key != leaf["discriminator_key"]
        ]
    return definitions


def inject_leaf_discriminator(category: Category, attributes: dict) -> dict:
    result = dict(attributes)
    leaf = LEAF_BY_SLUG.get(category.slug)
    if leaf and len(leaf["discriminator_values"]) == 1:
        result[leaf["discriminator_key"]] = leaf["discriminator_values"][0]
    return result


def effective_loaded_attribute_definitions(
    category: Category,
    *,
    hide_redundant_discriminator: bool = False,
) -> list[AttributeDefinition]:
    definitions = [
        *(category.parent.attributes if category.parent else []),
        *category.attributes,
    ]
    by_key = {item.key: item for item in definitions}
    result = sorted(by_key.values(), key=lambda item: item.sort_order)
    leaf = LEAF_BY_SLUG.get(category.slug)
    if (
        hide_redundant_discriminator
        and leaf
        and len(leaf["discriminator_values"]) == 1
    ):
        result = [
            item for item in result if item.key != leaf["discriminator_key"]
        ]
    return result
