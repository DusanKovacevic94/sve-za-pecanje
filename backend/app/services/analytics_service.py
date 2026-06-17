from sqlalchemy.orm import Session

from app.models.analytics import AnalyticsEvent


class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db

    def track(self, event_name: str, user_id: str | None = None, properties: dict | None = None) -> None:
        self.db.add(AnalyticsEvent(user_id=user_id, event_name=event_name, properties=properties or {}))
        self.db.commit()

