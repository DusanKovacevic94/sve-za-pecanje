from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.responses import data_response
from app.db.session import get_db
from app.services.feature_service import FeatureService
from app.services.listing_service import serialize_listing_card

router = APIRouter(prefix="/promotions", tags=["promotions"])


@router.get("/packages")
def promotion_packages(db: Session = Depends(get_db)):
    return data_response(FeatureService(db).list_packages())


@router.get("/homepage-listings")
def homepage_listings(db: Session = Depends(get_db)):
    listings = FeatureService(db).list_homepage_listings(limit=12)
    return data_response([serialize_listing_card(listing) for listing in listings])
