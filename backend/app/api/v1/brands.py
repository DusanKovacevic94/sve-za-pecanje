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
    category: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    statement = select(Brand).order_by(Brand.name)
    if q:
        statement = statement.where(Brand.name.ilike(f"%{q}%"))
    brands = db.scalars(statement.limit(50)).all()
    if category:
        selected = db.scalar(select(Category).where(Category.slug == category))
        scope_slugs = {category}
        if selected and selected.parent_id:
            parent_slug = db.scalar(
                select(Category.slug).where(Category.id == selected.parent_id)
            )
            if parent_slug:
                scope_slugs.add(parent_slug)
        brands = [
            brand
            for brand in brands
            if not brand.category_scope
            or any(slug in brand.category_scope for slug in scope_slugs)
        ]
    return data_response(
        [{"id": brand.id, "name": brand.name, "slug": brand.slug, "is_verified": brand.is_verified} for brand in brands]
    )
