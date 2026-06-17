from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.permissions import require_admin
from app.core.responses import data_response
from app.db.session import get_db
from app.models.listing import Listing
from app.models.report import Report
from app.models.user import User
from app.schemas.admin import (
    FeatureListingRequest,
    RejectListingRequest,
    ResolveReportRequest,
    SuspendUserRequest,
)
from app.services.listing_service import serialize_listing_detail
from app.services.moderation_service import ModerationService

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/dashboard")
def dashboard(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return data_response(ModerationService(db).dashboard())


@router.get("/listings")
def admin_listings(
    status: str | None = Query(default=None),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    statement = select(Listing).options(
        selectinload(Listing.seller).selectinload(User.profile),
        selectinload(Listing.category),
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
    return data_response(serialize_listing_detail(ModerationService(db).reject_listing(listing_id, admin, payload.reason)))


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


@router.post("/users/{user_id}/suspend")
def suspend_user(
    user_id: str,
    payload: SuspendUserRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = ModerationService(db).suspend_user(user_id, admin, payload.reason)
    return data_response({"id": user.id, "status": user.status})


@router.get("/reports")
def admin_reports(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    reports = db.scalars(select(Report).order_by(Report.created_at.desc()).limit(100)).all()
    return data_response(
        [
            {
                "id": report.id,
                "reporter_id": report.reporter_id,
                "listing_id": report.listing_id,
                "reported_user_id": report.reported_user_id,
                "reason": report.reason,
                "description": report.description,
                "status": report.status,
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

