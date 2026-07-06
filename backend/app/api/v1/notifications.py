from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.responses import data_response
from app.db.session import get_db
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/unsubscribe/{token}")
def unsubscribe(token: str, db: Session = Depends(get_db)):
    NotificationService(db).unsubscribe_all_email(token)
    return data_response({"message": "Odjavljeni ste sa email notifikacija."})
