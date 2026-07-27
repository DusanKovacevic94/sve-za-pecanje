from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.responses import data_response
from app.db.session import get_db
from app.services.seo_landing_service import SeoLandingService

router = APIRouter(prefix="/seo", tags=["seo"])


@router.get("/landings")
def indexable_landings(db: Session = Depends(get_db)):
    return data_response(SeoLandingService(db).indexable_landings())


@router.get("/resolve")
def resolve_landing(
    category_slug: str = Query(min_length=1),
    brand_id: str | None = None,
    db: Session = Depends(get_db),
):
    return data_response(
        SeoLandingService(db).resolve(category_slug, brand_id)
    )


@router.get("/landing/{category_slug}")
def category_landing(
    category_slug: str,
    db: Session = Depends(get_db),
):
    return data_response(SeoLandingService(db).get_public(category_slug))


@router.get("/landing/{category_slug}/brand/{brand_slug}")
def category_brand_landing(
    category_slug: str,
    brand_slug: str,
    db: Session = Depends(get_db),
):
    return data_response(
        SeoLandingService(db).get_public(category_slug, brand_slug)
    )
