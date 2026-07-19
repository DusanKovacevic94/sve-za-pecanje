from sqlalchemy.orm import Session

from app.services.risk_service import RiskService


def purge_expired_abuse_signals(db: Session) -> int:
    return RiskService(db).purge_expired_signals()
