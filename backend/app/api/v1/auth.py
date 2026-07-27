from fastapi import APIRouter, Cookie, Depends, Request, Response
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.rate_limit import check_rate_limit
from app.core.responses import data_response
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    VerifyEmailRequest,
)
from app.services.auth_service import AuthService, serialize_auth_user
from app.api.v1.deps import get_current_user
from app.core.security import decode_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register")
def register(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    check_rate_limit(request, "auth-register", 10, 60 * 60)
    from app.services.risk_service import RiskService

    risk = RiskService(db)
    risk.enforce("registration_attempt", request, token=payload.turnstile_token)
    risk.record_action("registration_attempt", request)
    user = AuthService(db).register(payload)
    return data_response({"user": serialize_auth_user(user)})


@router.post("/login")
def login(payload: LoginRequest, response: Response, request: Request, db: Session = Depends(get_db)):
    from app.services.risk_service import RiskService

    risk = RiskService(db)
    risk.enforce("login_attempt", request, token=payload.turnstile_token)
    risk.record_action("login_attempt", request)
    user, token = AuthService(db).login(
        payload.email,
        payload.password,
        request.headers.get("user-agent"),
    )
    response.set_cookie(
        settings.session_cookie_name,
        token,
        httponly=True,
        samesite="lax",
        secure=settings.app_env == "production",
        max_age=settings.access_token_minutes * 60,
    )
    return data_response({"user": serialize_auth_user(user)})


@router.post("/logout")
def logout(
    response: Response,
    session_cookie: str | None = Cookie(default=None, alias=settings.session_cookie_name),
    db: Session = Depends(get_db),
):
    payload = decode_access_token(session_cookie) if session_cookie else None
    if payload and payload.get("sid"):
        AuthService(db).revoke_session(payload["sid"])
    response.delete_cookie(settings.session_cookie_name)
    return data_response({"message": "Uspešno ste se odjavili."})


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return data_response({"user": serialize_auth_user(user)})


@router.post("/verify-email")
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    user = AuthService(db).verify_email(payload.token)
    return data_response({"user": serialize_auth_user(user)})


@router.post("/resend-verification")
def resend_verification(
    payload: ResendVerificationRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    check_rate_limit(request, "auth-resend-verification", 5, 60 * 60)
    AuthService(db).resend_verification(payload.email)
    return data_response({"message": "Ako nalog postoji i nije potvrđen, poslali smo novi email."})


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    check_rate_limit(request, "auth-forgot-password", 5, 60 * 60)
    from app.services.risk_service import RiskService

    risk = RiskService(db)
    risk.enforce("reset_attempt", request, token=payload.turnstile_token)
    risk.record_action("reset_attempt", request)
    AuthService(db).start_password_reset(payload.email)
    return data_response({"message": "Ako nalog postoji, poslali smo instrukcije za reset lozinke."})


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, request: Request, db: Session = Depends(get_db)):
    check_rate_limit(request, "auth-reset-password", 10, 60 * 60)
    from app.services.risk_service import RiskService

    risk = RiskService(db)
    risk.enforce("reset_attempt", request, token=payload.turnstile_token)
    risk.record_action("reset_attempt", request)
    AuthService(db).reset_password(payload.token, payload.new_password)
    return data_response({"message": "Lozinka je promenjena."})
