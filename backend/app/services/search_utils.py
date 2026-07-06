from sqlalchemy import Select, func, literal_column, or_

from app.models.brand import Brand
from app.models.listing import Listing

REPLACEMENTS = (
    ("š", "s"),
    ("đ", "dj"),
    ("č", "c"),
    ("ć", "c"),
    ("ž", "z"),
)


def normalize_search_text(value: str) -> str:
    normalized = value.lower()
    for source, target in REPLACEMENTS:
        normalized = normalized.replace(source, target)
    return normalized


def apply_listing_search(
    statement: Select,
    query: str,
    dialect_name: str,
    *,
    include_brand: bool = False,
) -> tuple[Select, object | None]:
    if dialect_name == "postgresql":
        ts_query = func.websearch_to_tsquery("simple", func.unaccent(query))
        vector = literal_column("listings.search_vector")
        statement = statement.where(vector.op("@@")(ts_query))
        return statement, func.ts_rank(vector, ts_query)

    normalized_query = normalize_search_text(query)
    pattern = f"%{normalized_query}%"
    fields = [
        _normalized_column(Listing.title),
        _normalized_column(Listing.description),
        _normalized_column(Listing.model),
        _normalized_column(Listing.city),
        _normalized_column(Listing.brand_name_custom),
    ]
    if include_brand:
        fields.append(_normalized_column(Brand.name))
    return statement.where(or_(*(field.like(pattern) for field in fields))), None


def _normalized_column(column):
    expression = func.lower(func.coalesce(column, ""))
    for source, target in REPLACEMENTS:
        expression = func.replace(expression, source, target)
    return expression
