from fastapi import APIRouter, Depends, File, Request, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.api.v1.deps import get_current_user, get_optional_user
from app.core.rate_limit import check_rate_limit
from app.core.responses import api_error, data_response
from app.db.session import get_db
from app.models.user import User
from app.schemas.listing import FeatureRequestCreate, ListingCreate, ListingUpdate, MarkSoldRequest, ReorderImagesRequest
from app.schemas.report import ReportCreate
from app.services.image_service import ImageService
from app.services.listing_service import (
    ListingService,
    serialize_listing_card,
    serialize_listing_detail,
)
from app.services.view_service import track_listing_view
from app.models.report import Report
from app.models.listing import Listing
from app.models.message import Conversation
from app.models.review import Review
from app.models.user import User as UserModel
from app.models.category import Category
from app.models.favorite import Favorite
from app.services.feature_service import FeatureService, serialize_feature_request

router = APIRouter(prefix="/listings", tags=["listings"])


def serialize_image(image) -> dict:
    return {"id": image.id, "url": image.url, "sort_order": image.sort_order, "is_cover": image.is_cover}


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


@router.get("/feature/packages")
def feature_packages(db: Session = Depends(get_db)):
    return data_response(FeatureService(db).list_feature_packages())


@router.get("/feature/requests")
def my_feature_requests(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    requests = FeatureService(db).list_for_user(user)
    return data_response([serialize_feature_request(request) for request in requests])


@router.get("/{slug}")
def get_listing(
    slug: str,
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    listing = ListingService(db).get_by_slug(slug)
    is_favorited = False
    if user:
        is_favorited = (
            db.scalar(select(Favorite.id).where(Favorite.user_id == user.id, Favorite.listing_id == listing.id))
            is not None
        )
    rating_average, review_count = db.execute(
        select(func.avg(Review.rating), func.count(Review.id)).where(
            Review.reviewee_id == listing.seller_id,
            Review.status == "published",
        )
    ).one()
    active_listing_count = db.scalar(
        select(func.count(Listing.id)).where(
            Listing.seller_id == listing.seller_id,
            Listing.status == "active",
        )
    )
    seller_stats = {
        "member_since": listing.seller.created_at,
        "rating_average": round(float(rating_average), 1) if rating_average else None,
        "review_count": int(review_count or 0),
        "active_listing_count": int(active_listing_count or 0),
    }
    return data_response(serialize_listing_detail(listing, is_favorited=is_favorited, seller_stats=seller_stats))


@router.get("/{listing_id}/similar")
def similar_listings(listing_id: str, db: Session = Depends(get_db)):
    listing = db.get(Listing, listing_id)
    if not listing:
        raise api_error("NOT_FOUND", "Oglas nije pronađen.", 404)
    rows = db.scalars(
        select(Listing)
        .options(
            selectinload(Listing.seller).selectinload(UserModel.profile),
            selectinload(Listing.category).selectinload(Category.attributes),
            selectinload(Listing.brand),
            selectinload(Listing.images),
        )
        .where(
            Listing.status == "active",
            Listing.category_id == listing.category_id,
            Listing.id != listing.id,
        )
        .order_by(Listing.is_featured.desc(), func.coalesce(Listing.bumped_at, Listing.created_at).desc())
        .limit(4)
    ).all()
    return data_response([serialize_listing_card(row) for row in rows])


@router.post("/{listing_id}/track-view")
def track_view(
    listing_id: str,
    request: Request,
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    listing = db.get(Listing, listing_id)
    if not listing or listing.status != "active":
        return data_response({"tracked": False})
    ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent")
    tracked = track_listing_view(db, listing.id, ip, user_agent, user_id=user.id if user else None)
    return data_response({"tracked": tracked})


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


@router.post("/{listing_id}/renew")
def renew_listing(listing_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    listing = FeatureService(db).renew_listing(listing_id, user)
    return data_response(serialize_listing_detail(listing))


@router.post("/{listing_id}/feature-request")
def create_feature_request(
    listing_id: str,
    payload: FeatureRequestCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    request = FeatureService(db).create_request(listing_id, user, payload.package_days, payload.type)
    return data_response(serialize_feature_request(request))


@router.get("/{listing_id}/buyer-candidates")
def buyer_candidates(
    listing_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ListingService(db)
    listing = service.get_owned_or_admin(listing_id, user)
    rows = db.execute(
        select(Conversation, UserModel)
        .join(UserModel, UserModel.id == Conversation.buyer_id)
        .options(selectinload(UserModel.profile))
        .where(Conversation.listing_id == listing.id, Conversation.seller_id == listing.seller_id)
        .order_by(Conversation.last_message_at.desc().nullslast())
    ).all()
    return data_response(
        [
            {
                "id": buyer.id,
                "username": buyer.username,
                "display_name": buyer.profile.display_name if buyer.profile else None,
                "last_message_at": conversation.last_message_at,
            }
            for conversation, buyer in rows
        ]
    )


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
    return data_response(serialize_image(image))


@router.delete("/{listing_id}/images/{image_id}")
def delete_image(
    listing_id: str,
    image_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ListingService(db)
    listing = service.get_owned_or_admin(listing_id, user)
    service.delete_image(listing, image_id)
    return data_response({"message": "Slika je obrisana."})


@router.post("/{listing_id}/images/{image_id}/cover")
def set_cover_image(
    listing_id: str,
    image_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ListingService(db)
    listing = service.get_owned_or_admin(listing_id, user)
    return data_response(serialize_image(service.set_cover_image(listing, image_id)))


@router.patch("/{listing_id}/images/reorder")
def reorder_images(
    listing_id: str,
    payload: ReorderImagesRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ListingService(db)
    listing = service.get_owned_or_admin(listing_id, user)
    return data_response([serialize_image(image) for image in service.reorder_images(listing, payload.image_ids)])
