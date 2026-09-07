from fastapi import APIRouter, Depends, Query, Request, Response
from sqlalchemy.orm import Session

from app.api.v1.deps import get_optional_user
from app.core.rate_limit import check_rate_limit
from app.core.responses import data_response
from app.core.permissions import require_admin
from app.db.session import get_db
from app.models.user import User
from app.schemas.analytics import PublicAnalyticsEventCreate
from app.services.analytics_service import AnalyticsService, BLOG_EVENT_NAMES, blog_report
from app.services.view_service import is_bot_user_agent

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.post("/events")
def create_public_event(
    payload: PublicAnalyticsEventCreate,
    request: Request,
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    check_rate_limit(request, "analytics-event", 120, 60)
    if payload.event_name in BLOG_EVENT_NAMES:
        if is_bot_user_agent(request.headers.get("user-agent")):
            return data_response({"tracked": False, "duplicate": False, "excluded": True})
        tracked = AnalyticsService(db).track_public_blog(
            event_name=payload.event_name,
            properties=payload.properties.model_dump(),
            ip_address=request.client.host if request.client else "unknown",
        )
        return data_response({"tracked": tracked, "duplicate": not tracked})
    tracked = AnalyticsService(db).track_public_search(
        client_event_id=payload.client_event_id,
        event_name=payload.event_name,
        anonymous_id=payload.anonymous_id,
        user_id=user.id if user else None,
        category_id=payload.category_id,
        properties=payload.properties.model_dump(),
        ip_address=request.client.host if request.client else "unknown",
        user_agent=request.headers.get("user-agent"),
    )
    return data_response({"tracked": tracked, "duplicate": not tracked})


@router.get("/blog")
def get_blog_report(
    response: Response,
    days: int = Query(default=30, ge=1, le=90),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    response.headers["Cache-Control"] = "private, no-store"
    return data_response(blog_report(db, days=days))
