from sqlalchemy import select
from sqlalchemy.dialects import postgresql

from app.core.category_catalog import CATEGORY_ATTRIBUTES
from app.core.category_taxonomy import LEAF_CATEGORIES
from app.models.listing import Listing


def test_category_catalog_snapshot_and_metadata_are_complete():
    assert {slug: len(items) for slug, items in CATEGORY_ATTRIBUTES.items()} == {
        "stapovi": 11,
        "masinice": 9,
        "varalice": 8,
        "najlon-struna-zavrsni-pribor": 10,
        "elektronika": 10,
        "camci-i-oprema": 10,
        "torbe-kutije-pribor": 9,
        "odeca-i-obuca": 7,
        "kompleti": 6,
        "ostalo": 4,
    }
    for definitions in CATEGORY_ATTRIBUTES.values():
        assert len({item["key"] for item in definitions}) == len(definitions)
        for definition in definitions:
            assert definition["label_sr"]
            assert definition["field_type"]
            assert definition["validation"]["filter_mode"]
            assert isinstance(definition["options"], dict)


def test_leaf_taxonomy_keeps_bundles_and_other_at_top_level():
    assert len(LEAF_CATEGORIES) == 48
    parent_slugs = {item["parent_slug"] for item in LEAF_CATEGORIES}
    assert "kompleti" not in parent_slugs
    assert "ostalo" not in parent_slugs
    assert len({item["slug"] for item in LEAF_CATEGORIES}) == len(LEAF_CATEGORIES)


def test_postgresql_multi_enum_filter_uses_jsonb_containment():
    statement = select(Listing.id).where(
        Listing.attributes["target_species"].contains(["stuka"])
    )
    compiled = str(statement.compile(dialect=postgresql.dialect()))
    assert "@>" in compiled
    assert "::JSONB" in compiled
