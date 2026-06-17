from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user
from app.core.responses import data_response
from app.db.session import get_db
from app.models.report import Report
from app.models.user import User

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/mine")
def list_my_reports(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    reports = db.scalars(select(Report).where(Report.reporter_id == user.id)).all()
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

