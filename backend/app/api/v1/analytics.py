from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.v1.deps import get_optional_user
from app.core.rate_limit import check_rate_limit
from app.core.responses import data_response
from app.db.session import get_db
from app.models.user import User
from app.schemas.analytics import PublicAnalyticsEventCreate
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.post("/events")
def create_public_event(
    payload: PublicAnalyticsEventCreate,
    request: Request,
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    check_rate_limit(request, "analytics-event", 120, 60)
    tracked = AnalyticsService(db).track_public_search(
        client_event_id=payload.client_event_id,
        anonymous_id=payload.anonymous_id,
        user_id=user.id if user else None,
        category_id=payload.category_id,
        properties=payload.properties.model_dump(),
        ip_address=request.client.host if request.client else "unknown",
        user_agent=request.headers.get("user-agent"),
    )
    return data_response({"tracked": tracked, "duplicate": not tracked})
