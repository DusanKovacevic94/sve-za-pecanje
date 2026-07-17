"""complete category attribute catalog

Revision ID: 0008_category_attribute_catalog
Revises: 0007_shop_subscriptions
Create Date: 2026-07-17 00:00:00.000000
"""

from collections.abc import Sequence
from datetime import UTC, datetime
import json
from uuid import uuid4

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

from app.core.category_catalog import CATEGORY_ATTRIBUTES

revision = "0008_category_attribute_catalog"
down_revision = "0007_shop_subscriptions"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _json_value(value):
    return json.dumps(value) if op.get_bind().dialect.name == "sqlite" else value


def upgrade() -> None:
    bind = op.get_bind()
    metadata = sa.MetaData()
    categories = sa.Table("categories", metadata, autoload_with=bind)
    definitions = sa.Table("attribute_definitions", metadata, autoload_with=bind)
    listings = sa.Table("listings", metadata, autoload_with=bind)
    now = datetime.now(UTC)

    if bind.dialect.name == "postgresql":
        op.alter_column(
            "listings",
            "attributes",
            type_=postgresql.JSONB(astext_type=sa.Text()),
            postgresql_using="attributes::jsonb",
        )
        op.create_index(
            "ix_listings_attributes_gin",
            "listings",
            ["attributes"],
            unique=False,
            postgresql_using="gin",
        )

    category_ids = dict(bind.execute(sa.select(categories.c.slug, categories.c.id)).all())
    for slug, catalog in CATEGORY_ATTRIBUTES.items():
        category_id = category_ids.get(slug)
        if not category_id:
            continue
        existing = {
            row.key: row.id
            for row in bind.execute(
                sa.select(definitions.c.id, definitions.c.key).where(
                    definitions.c.category_id == category_id
                )
            )
        }
        for sort_order, definition in enumerate(catalog):
            values = {
                "label_sr": definition["label_sr"],
                "field_type": definition["field_type"],
                "unit": definition["unit"],
                "required": definition["required"],
                "filterable": definition["filterable"],
                "searchable": definition["searchable"],
                "options": _json_value(definition["options"]),
                "validation": _json_value(definition["validation"]),
                "sort_order": sort_order,
                "updated_at": now,
            }
            if definition["key"] in existing:
                bind.execute(
                    definitions.update()
                    .where(definitions.c.id == existing[definition["key"]])
                    .values(**values)
                )
            else:
                bind.execute(
                    definitions.insert().values(
                        id=str(uuid4()),
                        category_id=category_id,
                        key=definition["key"],
                        created_at=now,
                        **values,
                    )
                )

    numeric_types = {
        definition["key"]: definition["field_type"]
        for catalog in CATEGORY_ATTRIBUTES.values()
        for definition in catalog
        if definition["field_type"] in {"integer", "decimal"}
    }
    boolean_keys = {
        definition["key"]
        for catalog in CATEGORY_ATTRIBUTES.values()
        for definition in catalog
        if definition["field_type"] == "boolean"
    }
    multi_keys = {
        definition["key"]
        for catalog in CATEGORY_ATTRIBUTES.values()
        for definition in catalog
        if definition["field_type"] == "multi_enum"
    }
    for row in bind.execute(sa.select(listings.c.id, listings.c.attributes)):
        attributes = row.attributes or {}
        if isinstance(attributes, str):
            attributes = json.loads(attributes)
        changed = False
        for key, value in list(attributes.items()):
            if key in boolean_keys and isinstance(value, str) and value.lower() in {"true", "false"}:
                attributes[key] = value.lower() == "true"
                changed = True
            elif key in multi_keys and isinstance(value, str):
                attributes[key] = [item.strip() for item in value.split(",") if item.strip()]
                changed = True
            elif key in numeric_types and isinstance(value, str):
                candidate = value.removesuffix(":1").strip()
                try:
                    attributes[key] = int(candidate) if numeric_types[key] == "integer" else float(candidate)
                    changed = True
                except ValueError:
                    pass
        if changed:
            bind.execute(
                listings.update()
                .where(listings.c.id == row.id)
                .values(attributes=_json_value(attributes))
            )


def downgrade() -> None:
    # Catalog expansion is backwards compatible data. Do not delete listing attributes or
    # definitions on downgrade because older application versions ignore unknown optional keys.
    if op.get_bind().dialect.name == "postgresql":
        op.drop_index("ix_listings_attributes_gin", table_name="listings")
        op.alter_column(
            "listings",
            "attributes",
            type_=sa.JSON(),
            postgresql_using="attributes::json",
        )
