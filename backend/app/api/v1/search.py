from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.rate_limit import check_rate_limit
from app.core.responses import data_response
from app.db.session import get_db
from app.schemas.search_discovery import SearchSuggestionOut
from app.services.listing_service import serialize_listing_card
from app.services.search_discovery_service import SearchDiscoveryService

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/suggestions")
def search_suggestions(
    request: Request,
    q: str = Query(min_length=2, max_length=80),
    limit: int = Query(default=10, ge=1, le=12),
    db: Session = Depends(get_db),
):
    check_rate_limit(
        request,
        f"search-suggestions:{request.client.host if request.client else 'unknown'}",
        120,
        60,
    )
    return data_response(
        [
            SearchSuggestionOut.model_validate(item)
            for item in SearchDiscoveryService(db).suggestions(q, limit)
        ]
    )


@router.get("/popular")
def popular_searches(
    limit: int = Query(default=6, ge=1, le=12),
    db: Session = Depends(get_db),
):
    return data_response(
        [
            SearchSuggestionOut.model_validate(item)
            for item in SearchDiscoveryService(db).popular_searches(limit)
        ]
    )


@router.get("/recovery")
def search_recovery(
    q: str | None = Query(default=None, max_length=80),
    category: list[str] = Query(default=[]),
    db: Session = Depends(get_db),
):
    service = SearchDiscoveryService(db)
    return data_response(
        {
            "did_you_mean": [
                SearchSuggestionOut.model_validate(item)
                for item in service.spelling_suggestions(q, limit=3)
            ]
            if q
            else [],
            "related_categories": service.related_categories(category),
            "recent_listings": [
                serialize_listing_card(listing)
                for listing in service.recent_recovery_listings(category, limit=3)
            ],
        }
    )
