from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user
from app.core.responses import data_response
from app.db.session import get_db
from app.models.user import User
from app.services.follow_service import FollowService
from app.services.listing_service import serialize_listing_card

router = APIRouter(prefix="/following", tags=["following"])


@router.get("/feed")
def following_feed(
    cursor: str | None = None,
    limit: int = Query(default=24, ge=1, le=48),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    listings, next_cursor = FollowService(db).feed(
        user.id,
        cursor=cursor,
        limit=limit,
    )
    return data_response(
        [serialize_listing_card(item) for item in listings],
        {"next_cursor": next_cursor},
    )


@router.get("")
def following_list(
    cursor: str | None = None,
    limit: int = Query(default=20, ge=1, le=50),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items, next_cursor = FollowService(db).list_following(
        user.id,
        cursor=cursor,
        limit=limit,
    )
    return data_response(items, {"next_cursor": next_cursor})


@router.post("/sellers/{seller_id}")
def follow_seller(
    seller_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = FollowService(db)
    service.follow(user, seller_id)
    return data_response(service.relationship_stats(seller_id, user.id))


@router.delete("/sellers/{seller_id}")
def unfollow_seller(
    seller_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = FollowService(db)
    service.unfollow(user.id, seller_id)
    return data_response(service.relationship_stats(seller_id, user.id))
