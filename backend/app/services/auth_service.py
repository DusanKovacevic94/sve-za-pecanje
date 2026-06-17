from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.email import send_email
from app.core.responses import api_error
from app.core.security import create_access_token, generate_token, hash_password, verify_password
from app.models.profile import UserProfile
from app.models.user import User
from app.schemas.auth import RegisterRequest


class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def register(self, payload: RegisterRequest) -> User:
        email = payload.email.lower()
        duplicate = self.db.scalar(
            select(User).where((User.email == email) | (User.username == payload.username))
        )
        if duplicate:
            raise api_error("DUPLICATE_RESOURCE", "Email ili korisničko ime je već zauzeto.", 409)

        user = User(
            email=email,
            username=payload.username,
            password_hash=hash_password(payload.password),
            email_verification_token=generate_token(),
        )
        user.profile = UserProfile(display_name=payload.username)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        send_email(
            user.email,
            "Potvrdite email adresu — Sve Za Pecanje",
            f"Token za potvrdu email adrese: {user.email_verification_token}",
        )
        return user

    def login(self, email: str, password: str) -> tuple[User, str]:
        user = self.db.scalar(select(User).where(User.email == email.lower()))
        if not user or not verify_password(password, user.password_hash):
            raise api_error("UNAUTHORIZED", "Email ili lozinka nisu ispravni.", 401)
        if user.status == "suspended":
            raise api_error("FORBIDDEN", "Nalog je suspendovan.", 403)
        user.last_login_at = datetime.now(UTC)
        if user.status == "pending_verification" and user.email_verified_at:
            user.status = "active"
        self.db.commit()
        return user, create_access_token(user.id, user.role)

    def verify_email(self, token: str) -> User:
        user = self.db.scalar(select(User).where(User.email_verification_token == token))
        if not user:
            raise api_error("NOT_FOUND", "Token za potvrdu nije pronađen.", 404)
        user.email_verified_at = datetime.now(UTC)
        user.email_verification_token = None
        user.status = "active"
        self.db.commit()
        self.db.refresh(user)
        return user

    def start_password_reset(self, email: str) -> None:
        user = self.db.scalar(select(User).where(User.email == email.lower()))
        if not user:
            return
        user.password_reset_token = generate_token()
        self.db.commit()
        send_email(
            user.email,
            "Reset lozinke — Sve Za Pecanje",
            f"Token za reset lozinke: {user.password_reset_token}",
        )

    def reset_password(self, token: str, new_password: str) -> None:
        user = self.db.scalar(select(User).where(User.password_reset_token == token))
        if not user:
            raise api_error("NOT_FOUND", "Token za reset lozinke nije pronađen.", 404)
        user.password_hash = hash_password(new_password)
        user.password_reset_token = None
        self.db.commit()


def serialize_auth_user(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "role": user.role,
        "status": user.status,
        "email_verified": bool(user.email_verified_at),
        "created_at": user.created_at,
    }

