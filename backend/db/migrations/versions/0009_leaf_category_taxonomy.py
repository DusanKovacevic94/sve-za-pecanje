"""add leaf category taxonomy

Revision ID: 0009_leaf_category_taxonomy
Revises: 0008_category_attribute_catalog
Create Date: 2026-07-17 00:30:00.000000
"""

from collections.abc import Sequence
from datetime import UTC, datetime
import json
from uuid import uuid4

import sqlalchemy as sa
from alembic import op

from app.core.category_taxonomy import LEAF_CATEGORIES

revision = "0009_leaf_category_taxonomy"
down_revision = "0008_category_attribute_catalog"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _attributes(value) -> dict:
    if isinstance(value, str):
        return json.loads(value)
    return value or {}


def upgrade() -> None:
    bind = op.get_bind()
    metadata = sa.MetaData()
    categories = sa.Table("categories", metadata, autoload_with=bind)
    listings = sa.Table("listings", metadata, autoload_with=bind)
    now = datetime.now(UTC)

    existing = {
        row.slug: row
        for row in bind.execute(
            sa.select(categories.c.id, categories.c.slug, categories.c.parent_id)
        )
    }
    order_by_parent: dict[str, int] = {}
    for item in LEAF_CATEGORIES:
        parent = existing.get(item["parent_slug"])
        if not parent:
            continue
        sort_order = order_by_parent.get(parent.id, 0)
        current = existing.get(item["slug"])
        values = {
            "parent_id": parent.id,
            "name_sr": item["name_sr"],
            "name_en": item["name_en"],
            "sort_order": sort_order,
            "is_active": True,
            "updated_at": now,
        }
        if current:
            bind.execute(categories.update().where(categories.c.id == current.id).values(**values))
        else:
            category_id = str(uuid4())
            bind.execute(
                categories.insert().values(
                    id=category_id,
                    slug=item["slug"],
                    description_sr=None,
                    created_at=now,
                    **values,
                )
            )
            existing[item["slug"]] = type(
                "CategoryRow",
                (),
                {"id": category_id, "slug": item["slug"], "parent_id": parent.id},
            )()
        order_by_parent[parent.id] = sort_order + 1

    leaf_for_value = {
        (item["parent_slug"], item["discriminator_key"], value): existing[item["slug"]].id
        for item in LEAF_CATEGORIES
        if item["slug"] in existing
        for value in item["discriminator_values"]
    }
    parent_slug_by_id = {
        row.id: row.slug
        for row in existing.values()
        if row.parent_id is None
    }
    for row in bind.execute(
        sa.select(listings.c.id, listings.c.category_id, listings.c.attributes)
    ):
        parent_slug = parent_slug_by_id.get(row.category_id)
        if not parent_slug:
            continue
        attributes = _attributes(row.attributes)
        matching_leaf = next(
            (
                leaf_id
                for (candidate_parent, key, value), leaf_id in leaf_for_value.items()
                if candidate_parent == parent_slug and attributes.get(key) == value
            ),
            None,
        )
        if matching_leaf:
            bind.execute(
                listings.update()
                .where(listings.c.id == row.id)
                .values(category_id=matching_leaf, updated_at=now)
            )


def downgrade() -> None:
    bind = op.get_bind()
    metadata = sa.MetaData()
    categories = sa.Table("categories", metadata, autoload_with=bind)
    listings = sa.Table("listings", metadata, autoload_with=bind)
    rows = {
        row.slug: row
        for row in bind.execute(sa.select(categories.c.id, categories.c.slug, categories.c.parent_id))
    }
    for item in LEAF_CATEGORIES:
        leaf_row = rows.get(item["slug"])
        parent_row = rows.get(item["parent_slug"])
        if leaf_row and parent_row:
            bind.execute(
                listings.update()
                .where(listings.c.category_id == leaf_row.id)
                .values(category_id=parent_row.id)
            )
            bind.execute(categories.delete().where(categories.c.id == leaf_row.id))
