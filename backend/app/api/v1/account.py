from fastapi import APIRouter, Depends, Query, Request, Response
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_auth_session, get_current_user
from app.core.config import settings
from app.core.rate_limit import check_rate_limit
from app.core.responses import data_response
from app.db.session import get_db
from app.models.auth_session import AuthSession
from app.models.user import User
from app.schemas.account import AccountClosureCancelRequest, AccountClosureRequest
from app.services.account_service import AccountService, download_export

router = APIRouter(prefix="/account", tags=["account"])


def _request_context(request: Request) -> dict:
    return {
        "ip_address": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
    }


@router.get("/sessions")
def list_sessions(
    user: User = Depends(get_current_user),
    session: AuthSession = Depends(get_current_auth_session),
    db: Session = Depends(get_db),
):
    return data_response(AccountService(db).list_sessions(user, session.id))


@router.delete("/sessions/{session_id}")
def revoke_session(
    session_id: str,
    request: Request,
    response: Response,
    user: User = Depends(get_current_user),
    session: AuthSession = Depends(get_current_auth_session),
    db: Session = Depends(get_db),
):
    current_revoked = AccountService(db).revoke_session(
        user,
        session.id,
        session_id,
        **_request_context(request),
    )
    if current_revoked:
        response.delete_cookie(settings.session_cookie_name)
    return data_response({"revoked": True, "current_session_revoked": current_revoked})


@router.post("/sessions/revoke-others")
def revoke_other_sessions(
    request: Request,
    user: User = Depends(get_current_user),
    session: AuthSession = Depends(get_current_auth_session),
    db: Session = Depends(get_db),
):
    count = AccountService(db).revoke_other_sessions(
        user,
        session.id,
        **_request_context(request),
    )
    return data_response({"revoked_count": count})


@router.get("/exports")
def list_exports(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return data_response(AccountService(db).list_exports(user))


@router.post("/exports")
def request_export(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_rate_limit(request, f"account-export:{user.id}", 3, 24 * 60 * 60)
    item = AccountService(db).request_export(
        user,
        **_request_context(request),
    )
    return data_response(
        {"id": item.id, "status": item.status, "created_at": item.created_at}
    )


@router.get("/exports/download")
def get_export_download(
    token: str = Query(min_length=20, max_length=200),
    db: Session = Depends(get_db),
):
    archive, filename = download_export(db, token)
    return Response(
        content=archive,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/closure")
def closure_status(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return data_response(AccountService(db).closure_status(user))


@router.post("/closure")
def request_closure(
    payload: AccountClosureRequest,
    request: Request,
    response: Response,
    user: User = Depends(get_current_user),
    session: AuthSession = Depends(get_current_auth_session),
    db: Session = Depends(get_db),
):
    closure = AccountService(db).request_closure(
        user,
        session,
        payload.confirmation,
        **_request_context(request),
    )
    response.delete_cookie(settings.session_cookie_name)
    return data_response(
        {
            "status": closure.status,
            "requested_at": closure.requested_at,
            "scheduled_for": closure.scheduled_for,
        }
    )


@router.post("/closure/cancel")
def cancel_closure(
    payload: AccountClosureCancelRequest,
    request: Request,
    user: User = Depends(get_current_user),
    session: AuthSession = Depends(get_current_auth_session),
    db: Session = Depends(get_db),
):
    closure = AccountService(db).cancel_closure(
        user,
        session,
        payload.confirmation,
        **_request_context(request),
    )
    return data_response({"status": closure.status, "cancelled_at": closure.cancelled_at})
