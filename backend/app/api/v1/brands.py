from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.responses import data_response
from app.db.session import get_db
from app.models.brand import Brand
from app.models.category import Category

router = APIRouter(prefix="/brands", tags=["brands"])


@router.get("")
def list_brands(
    q: str | None = Query(default=None),
    category: list[str] | None = Query(default=None),
    include: list[str] | None = Query(default=None),
    db: Session = Depends(get_db),
):
    statement = select(Brand).order_by(Brand.name)
    if q:
        statement = statement.where(Brand.name.ilike(f"%{q}%"))
    brands = db.scalars(statement.limit(50)).all()
    if category:
        selected = list(
            db.scalars(select(Category).where(Category.slug.in_(category))).all()
        )
        scope_slugs = set(category)
        parent_ids = {item.parent_id for item in selected if item.parent_id}
        scope_slugs.update(
            db.scalars(select(Category.slug).where(Category.id.in_(parent_ids))).all()
        )
        brands = [
            brand
            for brand in brands
            if not brand.category_scope
            or any(slug in brand.category_scope for slug in scope_slugs)
            or brand.id in (include or [])
        ]
    return data_response(
        [{"id": brand.id, "name": brand.name, "slug": brand.slug, "is_verified": brand.is_verified} for brand in brands]
    )
