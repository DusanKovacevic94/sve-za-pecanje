from fastapi import APIRouter, Depends, File, Request, UploadFile
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user, get_optional_user
from app.core.rate_limit import check_rate_limit
from app.core.responses import api_error, data_response
from app.db.session import get_db
from app.models.user import User
from app.schemas.listing import ListingCreate, ListingUpdate, MarkSoldRequest
from app.schemas.report import ReportCreate
from app.services.image_service import ImageService
from app.services.listing_service import (
    ListingService,
    serialize_listing_card,
    serialize_listing_detail,
)
from app.models.report import Report
from app.models.listing import Listing

router = APIRouter(prefix="/listings", tags=["listings"])


@router.get("")
def list_listings(request: Request, db: Session = Depends(get_db)):
    params = dict(request.query_params)
    page = max(int(params.get("page", 1)), 1)
    page_size = min(max(int(params.get("page_size", 24)), 1), 48)
    listings, total = ListingService(db).list_public(params)
    total_pages = max((total + page_size - 1) // page_size, 1)
    return data_response(
        [serialize_listing_card(listing) for listing in listings],
        {"page": page, "page_size": page_size, "total": total, "total_pages": total_pages},
    )


@router.get("/{slug}")
def get_listing(
    slug: str,
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    listing = ListingService(db).get_by_slug(slug)
    is_favorited = False
    if user:
        from sqlalchemy import select

        from app.models.favorite import Favorite

        is_favorited = (
            db.scalar(select(Favorite.id).where(Favorite.user_id == user.id, Favorite.listing_id == listing.id))
            is not None
        )
    return data_response(serialize_listing_detail(listing, is_favorited=is_favorited))


@router.get("/{listing_id}/edit")
def get_listing_for_edit(
    listing_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    listing = ListingService(db).get_owned_or_admin(listing_id, user)
    return data_response(serialize_listing_detail(listing))


@router.post("")
def create_listing(
    payload: ListingCreate,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_rate_limit(request, f"listing-create:{user.id}", 10, 24 * 60 * 60)
    listing = ListingService(db).create(user, payload)
    return data_response(serialize_listing_detail(listing))


@router.patch("/{listing_id}")
def update_listing(
    listing_id: str,
    payload: ListingUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ListingService(db)
    listing = service.get_owned_or_admin(listing_id, user)
    return data_response(serialize_listing_detail(service.update(listing, payload, user)))


@router.delete("/{listing_id}")
def delete_listing(
    listing_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ListingService(db)
    listing = service.get_owned_or_admin(listing_id, user)
    return data_response(serialize_listing_detail(service.archive(listing)))


@router.post("/{listing_id}/archive")
def archive_listing(listing_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    service = ListingService(db)
    listing = service.get_owned_or_admin(listing_id, user)
    return data_response(serialize_listing_detail(service.archive(listing)))


@router.post("/{listing_id}/mark-sold")
def mark_sold(
    listing_id: str,
    payload: MarkSoldRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ListingService(db)
    listing = service.get_owned_or_admin(listing_id, user)
    return data_response(serialize_listing_detail(service.mark_sold(listing, user, payload.sold_to_user_id)))


@router.post("/{listing_id}/favorite")
def favorite_listing(listing_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ListingService(db).favorite(listing_id, user)
    return data_response({"message": "Oglas je dodat u omiljene."})


@router.delete("/{listing_id}/favorite")
def unfavorite_listing(listing_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ListingService(db).unfavorite(listing_id, user)
    return data_response({"message": "Oglas je uklonjen iz omiljenih."})


@router.post("/{listing_id}/report")
def report_listing(
    listing_id: str,
    payload: ReportCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    listing = db.get(Listing, listing_id)
    if not listing:
        raise api_error("NOT_FOUND", "Oglas nije pronađen.", 404)
    from sqlalchemy import select

    report = db.scalar(select(Report).where(Report.reporter_id == user.id, Report.listing_id == listing_id))
    if report:
        report.reason = payload.reason
        report.description = payload.description
        report.status = "open"
    else:
        db.add(
            Report(
                reporter_id=user.id,
                listing_id=listing_id,
                reported_user_id=listing.seller_id,
                reason=payload.reason,
                description=payload.description,
            )
        )
    db.commit()
    return data_response({"message": "Prijava je poslata administratorima."})


@router.post("/{listing_id}/images")
def upload_image(
    listing_id: str,
    upload: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ListingService(db)
    listing = service.get_owned_or_admin(listing_id, user)
    image = ImageService(db).upload_listing_image(listing, upload)
    return data_response(
        {"id": image.id, "url": image.url, "sort_order": image.sort_order, "is_cover": image.is_cover}
    )
