from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.v1.categories import serialize_category
from app.core.config import settings
from app.core.permissions import require_admin
from app.core.responses import api_error, data_response
from app.db.session import get_db
from app.models.brand import Brand
from app.models.category import Category
from app.models.email_outbox import EmailOutbox
from app.models.listing import Listing
from app.models.report import Report
from app.models.user import User
from app.schemas.admin import (
    BrandCreateRequest,
    BrandUpdateRequest,
    FeatureListingRequest,
    RejectListingRequest,
    ResolveFeatureRequest,
    ResolveReportRequest,
    SuspendUserRequest,
)
from app.services.listing_service import serialize_listing_detail, slugify
from app.services.moderation_service import ModerationService
from app.services.feature_service import FeatureService, serialize_feature_request
from app.services.shop_service import (
    ShopService,
    serialize_shop_profile,
    serialize_shop_subscription_request,
)

router = APIRouter(prefix="/admin", tags=["admin"])


def serialize_brand(brand: Brand) -> dict:
    return {
        "id": brand.id,
        "name": brand.name,
        "slug": brand.slug,
        "aliases": brand.aliases,
        "category_scope": brand.category_scope,
        "is_verified": brand.is_verified,
        "created_at": brand.created_at,
        "updated_at": brand.updated_at,
    }


def unique_brand_slug(db: Session, name: str, current_id: str | None = None) -> str:
    base = slugify(name)
    candidate = base
    suffix = 2
    while True:
        existing = db.scalar(select(Brand).where(Brand.slug == candidate))
        if not existing or existing.id == current_id:
            return candidate
        candidate = f"{base}-{suffix}"
        suffix += 1


@router.get("/dashboard")
def dashboard(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return data_response(ModerationService(db).dashboard())


@router.get("/config")
def admin_config(admin: User = Depends(require_admin)):
    return data_response(
        {
            "app_env": settings.app_env,
            "listing_review_mode": settings.listing_review_mode,
            "listing_lifetime_days": settings.listing_lifetime_days,
            "max_listing_images": settings.max_listing_images,
            "max_image_size_mb": settings.max_image_size_mb,
            "rate_limit_enabled": settings.rate_limit_enabled,
            "storage_backend": settings.storage_backend,
            "use_s3_storage": settings.use_s3_storage,
        }
    )


@router.get("/categories")
def admin_categories(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    categories = db.scalars(
        select(Category)
        .options(
            selectinload(Category.children).selectinload(Category.attributes),
            selectinload(Category.attributes),
            selectinload(Category.parent).selectinload(Category.attributes),
        )
        .order_by(Category.parent_id.nullsfirst(), Category.sort_order)
    ).all()
    return data_response([
        serialize_category(category, include_children=False)
        for category in categories
    ])


@router.get("/brands")
def admin_brands(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    brands = db.scalars(select(Brand).order_by(Brand.name)).all()
    return data_response([serialize_brand(brand) for brand in brands])


@router.post("/brands")
def create_brand(
    payload: BrandCreateRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    brand = Brand(
        name=payload.name.strip(),
        slug=unique_brand_slug(db, payload.name),
        aliases=payload.aliases,
        category_scope=payload.category_scope,
        is_verified=payload.is_verified,
    )
    db.add(brand)
    db.commit()
    db.refresh(brand)
    return data_response(serialize_brand(brand))


@router.patch("/brands/{brand_id}")
def update_brand(
    brand_id: str,
    payload: BrandUpdateRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    brand = db.get(Brand, brand_id)
    if not brand:
        raise api_error("NOT_FOUND", "Brend nije pronađen.", 404)
    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"]:
        brand.name = data["name"].strip()
        brand.slug = unique_brand_slug(db, brand.name, current_id=brand.id)
    for key in ["aliases", "category_scope", "is_verified"]:
        if key in data:
            setattr(brand, key, data[key])
    db.commit()
    db.refresh(brand)
    return data_response(serialize_brand(brand))


@router.delete("/brands/{brand_id}")
def delete_brand(
    brand_id: str,
    merge_into_id: str | None = Query(default=None),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    brand = db.get(Brand, brand_id)
    if not brand:
        raise api_error("NOT_FOUND", "Brend nije pronađen.", 404)
    if merge_into_id == brand_id:
        raise api_error("VALIDATION_ERROR", "Izaberite drugi brend za spajanje.", 400)
    replacement = db.get(Brand, merge_into_id) if merge_into_id else None
    if merge_into_id and not replacement:
        raise api_error("NOT_FOUND", "Ciljni brend nije pronađen.", 404)
    listings = db.scalars(select(Listing).where(Listing.brand_id == brand.id)).all()
    for listing in listings:
        listing.brand_id = replacement.id if replacement else None
        if not replacement and not listing.brand_name_custom:
            listing.brand_name_custom = brand.name
    db.delete(brand)
    db.commit()
    return data_response({"message": "Brend je obrisan.", "updated_listings": len(listings)})


@router.get("/listings")
def admin_listings(
    status: str | None = Query(default=None),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    statement = select(Listing).options(
        selectinload(Listing.seller).selectinload(User.profile),
        selectinload(Listing.category).selectinload(Category.attributes),
        selectinload(Listing.brand),
        selectinload(Listing.images),
    )
    if status:
        statement = statement.where(Listing.status == status)
    listings = db.scalars(statement.order_by(Listing.created_at.desc()).limit(100)).all()
    return data_response([serialize_listing_detail(listing) for listing in listings])


@router.post("/listings/{listing_id}/approve")
def approve_listing(listing_id: str, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return data_response(serialize_listing_detail(ModerationService(db).approve_listing(listing_id, admin)))


@router.post("/listings/{listing_id}/reject")
def reject_listing(
    listing_id: str,
    payload: RejectListingRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return data_response(
        serialize_listing_detail(ModerationService(db).reject_listing(listing_id, admin, payload.resolved_reason))
    )


@router.post("/listings/{listing_id}/feature")
def feature_listing(
    listing_id: str,
    payload: FeatureListingRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return data_response(
        serialize_listing_detail(ModerationService(db).feature_listing(listing_id, admin, payload.featured_until))
    )


@router.get("/feature-requests")
def feature_requests(
    status: str | None = Query(default=None),
    type: str | None = Query(default=None),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    requests = FeatureService(db).list_admin(status, type)
    return data_response([serialize_feature_request(request) for request in requests])


@router.post("/feature-requests/{request_id}/approve")
def approve_feature_request(
    request_id: str,
    payload: ResolveFeatureRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    request = FeatureService(db).approve(request_id, admin, payload.admin_note)
    ModerationService(db).audit(admin, "promotion_order.approved", "promotion_order", request.id)
    db.commit()
    return data_response(serialize_feature_request(request))


@router.post("/feature-requests/{request_id}/reject")
def reject_feature_request(
    request_id: str,
    payload: ResolveFeatureRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    request = FeatureService(db).reject(request_id, admin, payload.admin_note)
    ModerationService(db).audit(admin, "promotion_order.rejected", "promotion_order", request.id)
    db.commit()
    return data_response(serialize_feature_request(request))


@router.get("/users")
def admin_users(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    users = db.scalars(select(User).order_by(User.created_at.desc()).limit(100)).all()
    return data_response(
        [
            {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "role": user.role,
                "status": user.status,
                "created_at": user.created_at,
            }
            for user in users
        ]
    )


@router.get("/shops")
def admin_shops(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    users = ShopService(db).list_admin_shops()
    return data_response(
        [
            {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "created_at": user.created_at,
                **serialize_shop_profile(user.profile),
            }
            for user in users
            if user.profile
        ]
    )


@router.post("/shops/{user_id}/deactivate")
def deactivate_shop(user_id: str, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    profile = ShopService(db).deactivate_shop(user_id)
    ModerationService(db).audit(admin, "shop.deactivated", "user", user_id)
    db.commit()
    return data_response(serialize_shop_profile(profile))


@router.get("/shop-subscription-requests")
def admin_shop_subscription_requests(
    status: str | None = Query(default=None),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    requests = ShopService(db).list_admin_requests(status)
    return data_response([serialize_shop_subscription_request(request) for request in requests])


@router.post("/shop-subscription-requests/{request_id}/approve")
def approve_shop_subscription_request(
    request_id: str,
    payload: ResolveFeatureRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    request = ShopService(db).approve_request(request_id, admin, payload.admin_note)
    ModerationService(db).audit(admin, "shop_subscription.approved", "shop_subscription_request", request.id)
    db.commit()
    return data_response(serialize_shop_subscription_request(request))


@router.post("/shop-subscription-requests/{request_id}/reject")
def reject_shop_subscription_request(
    request_id: str,
    payload: ResolveFeatureRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    request = ShopService(db).reject_request(request_id, admin, payload.admin_note)
    ModerationService(db).audit(admin, "shop_subscription.rejected", "shop_subscription_request", request.id)
    db.commit()
    return data_response(serialize_shop_subscription_request(request))


@router.post("/users/{user_id}/suspend")
def suspend_user(
    user_id: str,
    payload: SuspendUserRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = ModerationService(db).suspend_user(user_id, admin, payload.reason)
    return data_response({"id": user.id, "status": user.status})


@router.post("/users/{user_id}/unsuspend")
def unsuspend_user(user_id: str, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = ModerationService(db).unsuspend_user(user_id, admin)
    return data_response({"id": user.id, "status": user.status})


@router.get("/reports")
def admin_reports(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    reports = db.scalars(select(Report).order_by(Report.created_at.desc()).limit(100)).all()
    listing_ids = {report.listing_id for report in reports if report.listing_id}
    user_ids = {report.reported_user_id for report in reports if report.reported_user_id}
    listings = {listing.id: listing for listing in db.scalars(select(Listing).where(Listing.id.in_(listing_ids))).all()}
    users = {user.id: user for user in db.scalars(select(User).where(User.id.in_(user_ids))).all()}
    return data_response(
        [
            {
                "id": report.id,
                "reporter_id": report.reporter_id,
                "listing_id": report.listing_id,
                "reported_user_id": report.reported_user_id,
                "listing": (
                    {"id": listings[report.listing_id].id, "title": listings[report.listing_id].title, "slug": listings[report.listing_id].slug}
                    if report.listing_id and report.listing_id in listings
                    else None
                ),
                "reported_user": (
                    {
                        "id": users[report.reported_user_id].id,
                        "username": users[report.reported_user_id].username,
                        "status": users[report.reported_user_id].status,
                    }
                    if report.reported_user_id and report.reported_user_id in users
                    else None
                ),
                "reason": report.reason,
                "description": report.description,
                "status": report.status,
                "resolution_note": report.resolution_note,
            }
            for report in reports
        ]
    )


@router.post("/reports/{report_id}/resolve")
def resolve_report(
    report_id: str,
    payload: ResolveReportRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    report = ModerationService(db).resolve_report(report_id, admin, payload.status, payload.resolution_note)
    return data_response({"id": report.id, "status": report.status})


@router.get("/emails/failed")
def failed_emails(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    emails = db.scalars(
        select(EmailOutbox).where(EmailOutbox.status == "failed").order_by(EmailOutbox.updated_at.desc()).limit(100)
    ).all()
    return data_response(
        [
            {
                "id": email.id,
                "to_email": email.to_email,
                "subject": email.subject,
                "status": email.status,
                "attempts": email.attempts,
                "last_error": email.last_error,
                "created_at": email.created_at,
                "updated_at": email.updated_at,
            }
            for email in emails
        ]
    )


@router.post("/emails/{email_id}/retry")
def retry_email(email_id: str, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    email = db.get(EmailOutbox, email_id)
    if not email:
        raise api_error("NOT_FOUND", "Email nije pronađen.", 404)
    email.status = "pending"
    email.attempts = 0
    email.next_attempt_at = None
    email.last_error = None
    ModerationService(db).audit(admin, "email.retry", "email_outbox", email.id)
    db.commit()
    return data_response({"id": email.id, "status": email.status})
