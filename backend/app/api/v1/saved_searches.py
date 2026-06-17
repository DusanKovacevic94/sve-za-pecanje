from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user
from app.core.responses import data_response
from app.db.session import get_db
from app.models.saved_search import SavedSearch
from app.models.user import User
from app.schemas.search import SavedSearchCreate
from app.services.search_service import SearchService

router = APIRouter(prefix="/saved-searches", tags=["saved-searches"])


@router.get("")
def list_saved_searches(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    searches = db.scalars(select(SavedSearch).where(SavedSearch.user_id == user.id)).all()
    search_service = SearchService(db)
    return data_response(
        [
            {
                "id": item.id,
                "name": item.name,
                "query": item.query,
                "filters": item.filters,
                "notification_enabled": item.notification_enabled,
                "matching_count": search_service.matching_count(item.query, item.filters),
            }
            for item in searches
        ]
    )


@router.post("")
def create_saved_search(
    payload: SavedSearchCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = SavedSearch(
        user_id=user.id,
        name=payload.name,
        query=payload.query,
        filters=payload.filters,
        notification_enabled=payload.notification_enabled,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return data_response(
        {
            "id": item.id,
            "name": item.name,
            "query": item.query,
            "filters": item.filters,
            "notification_enabled": item.notification_enabled,
            "matching_count": SearchService(db).matching_count(item.query, item.filters),
        }
    )


@router.delete("/{saved_search_id}")
def delete_saved_search(
    saved_search_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.get(SavedSearch, saved_search_id)
    if item and item.user_id == user.id:
        db.delete(item)
        db.commit()
    return data_response({"message": "Sačuvana pretraga je obrisana."})

