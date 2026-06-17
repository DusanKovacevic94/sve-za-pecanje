from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.responses import data_response
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    VerifyEmailRequest,
)
from app.services.auth_service import AuthService, serialize_auth_user
from app.api.v1.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register")
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    user = AuthService(db).register(payload)
    return data_response({"user": serialize_auth_user(user)})


@router.post("/login")
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user, token = AuthService(db).login(payload.email, payload.password)
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
def logout(response: Response):
    response.delete_cookie(settings.session_cookie_name)
    return data_response({"message": "Uspešno ste se odjavili."})


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return data_response({"user": serialize_auth_user(user)})


@router.post("/verify-email")
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    user = AuthService(db).verify_email(payload.token)
    return data_response({"user": serialize_auth_user(user)})


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    AuthService(db).start_password_reset(payload.email)
    return data_response({"message": "Ako nalog postoji, poslali smo instrukcije za reset lozinke."})


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    AuthService(db).reset_password(payload.token, payload.new_password)
    return data_response({"message": "Lozinka je promenjena."})

