from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.responses import api_error, data_response
from app.db.session import get_db
from app.models.category import Category, City
from app.models.listing import Listing

router = APIRouter(prefix="/categories", tags=["categories"])


def serialize_category(category: Category, include_children: bool = True, active_counts: dict[str, int] | None = None) -> dict:
    active_counts = active_counts or {}
    count = active_counts.get(category.id, 0)
    if include_children:
        count += sum(active_counts.get(child.id, 0) for child in category.children)
    return {
        "id": category.id,
        "parent_id": category.parent_id,
        "slug": category.slug,
        "name_sr": category.name_sr,
        "name_en": category.name_en,
        "description_sr": category.description_sr,
        "sort_order": category.sort_order,
        "active_count": count,
        "updated_at": category.updated_at,
        "attributes": [
            {
                "id": attr.id,
                "key": attr.key,
                "label_sr": attr.label_sr,
                "field_type": attr.field_type,
                "unit": attr.unit,
                "required": attr.required,
                "filterable": attr.filterable,
                "searchable": attr.searchable,
                "options": attr.options,
                "validation": attr.validation,
                "sort_order": attr.sort_order,
            }
            for attr in sorted(category.attributes, key=lambda item: item.sort_order)
        ],
        "children": [
            serialize_category(child, include_children=True, active_counts=active_counts)
            for child in sorted(category.children, key=lambda item: item.sort_order)
        ]
        if include_children
        else [],
    }


@router.get("")
def list_categories(db: Session = Depends(get_db)):
    count_rows = db.execute(
        select(Listing.category_id, func.count(Listing.id))
        .where(Listing.status == "active")
        .group_by(Listing.category_id)
    ).all()
    active_counts = {category_id: count for category_id, count in count_rows}
    categories = db.scalars(
        select(Category)
        .options(selectinload(Category.children), selectinload(Category.attributes))
        .where(Category.parent_id.is_(None), Category.is_active.is_(True))
        .order_by(Category.sort_order)
    ).all()
    return data_response([serialize_category(category, active_counts=active_counts) for category in categories])


@router.get("/cities")
def list_cities(db: Session = Depends(get_db)):
    cities = db.scalars(select(City).order_by(City.name)).all()
    return data_response([{"id": city.id, "name": city.name} for city in cities])


@router.get("/{slug}")
def get_category(slug: str, db: Session = Depends(get_db)):
    category = db.scalar(
        select(Category)
        .options(selectinload(Category.children), selectinload(Category.attributes))
        .where(Category.slug == slug, Category.is_active.is_(True))
    )
    if not category:
        raise api_error("NOT_FOUND", "Kategorija nije pronađena.", 404)
    return data_response(serialize_category(category))
