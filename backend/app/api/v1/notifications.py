from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user
from app.core.responses import data_response
from app.db.session import get_db
from app.models.user import User
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
def list_notifications(
    cursor: str | None = None,
    limit: int = 20,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = NotificationService(db)
    rows, next_cursor = service.list_for_user(user.id, cursor=cursor, limit=limit)
    return data_response(
        [service.serialize(item, user.id) for item in rows],
        {"next_cursor": next_cursor},
    )


@router.get("/unread-count")
def unread_count(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return data_response(
        {"unread_count": NotificationService(db).unread_count(user.id)}
    )


@router.post("/read-all")
def mark_all_read(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = NotificationService(db).mark_all_read(user.id)
    return data_response({"marked_read": count, "unread_count": 0})


@router.post("/{notification_id}/read")
def mark_read(
    notification_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = NotificationService(db)
    item = service.mark_read(notification_id, user.id)
    return data_response(service.serialize(item, user.id))


@router.get("/unsubscribe/{token}")
def unsubscribe(token: str, db: Session = Depends(get_db)):
    NotificationService(db).unsubscribe_all_email(token)
    return data_response({"message": "Odjavljeni ste sa email notifikacija."})
