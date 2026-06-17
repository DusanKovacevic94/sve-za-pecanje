from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.responses import data_response
from app.db.session import get_db
from app.models.brand import Brand

router = APIRouter(prefix="/brands", tags=["brands"])


@router.get("")
def list_brands(q: str | None = Query(default=None), db: Session = Depends(get_db)):
    statement = select(Brand).order_by(Brand.name)
    if q:
        statement = statement.where(Brand.name.ilike(f"%{q}%"))
    brands = db.scalars(statement.limit(50)).all()
    return data_response(
        [{"id": brand.id, "name": brand.name, "slug": brand.slug, "is_verified": brand.is_verified} for brand in brands]
    )

