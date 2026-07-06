from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.email import enqueue_email, render_action_email
from app.core.responses import api_error
from app.core.security import create_access_token, generate_token, hash_password, hash_token, verify_password
from app.models.auth_session import AuthSession
from app.models.profile import UserProfile
from app.models.user import User
from app.schemas.auth import RegisterRequest

EMAIL_VERIFICATION_TOKEN_HOURS = 24
PASSWORD_RESET_TOKEN_HOURS = 1


def _as_utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=UTC)


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

        token = generate_token()
        user = User(
            email=email,
            username=payload.username,
            password_hash=hash_password(payload.password),
            email_verification_token_hash=hash_token(token),
            email_verification_expires_at=datetime.now(UTC) + timedelta(hours=EMAIL_VERIFICATION_TOKEN_HOURS),
        )
        user.profile = UserProfile(display_name=payload.username)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        self.send_verification_email(user, token)
        return user

    def send_verification_email(self, user: User, token: str) -> None:
        verify_url = f"{settings.app_url.rstrip('/')}/verifikacija-emaila?token={token}"
        enqueue_email(
            self.db,
            user.email,
            "Potvrdite email adresu - Sve Za Pecanje",
            f"Potvrdite email adresu otvaranjem linka: {verify_url}",
            html=render_action_email(
                "Potvrdite email adresu",
                f"Zdravo {user.username}, hvala na registraciji. Potvrdite email adresu da biste mogli da postavljate oglase.",
                "Potvrdi email",
                verify_url,
            ),
        )
        self.db.commit()

    def resend_verification(self, email: str) -> None:
        user = self.db.scalar(select(User).where(User.email == email.lower()))
        if not user or user.email_verified_at:
            return
        token = generate_token()
        user.email_verification_token_hash = hash_token(token)
        user.email_verification_expires_at = datetime.now(UTC) + timedelta(hours=EMAIL_VERIFICATION_TOKEN_HOURS)
        self.db.commit()
        self.send_verification_email(user, token)

    def login(self, email: str, password: str) -> tuple[User, str]:
        user = self.db.scalar(select(User).where(User.email == email.lower()))
        if not user or not verify_password(password, user.password_hash):
            raise api_error("UNAUTHORIZED", "Email ili lozinka nisu ispravni.", 401)
        if user.status == "suspended":
            raise api_error("FORBIDDEN", "Nalog je suspendovan.", 403)
        user.last_login_at = datetime.now(UTC)
        if user.status == "pending_verification" and user.email_verified_at:
            user.status = "active"
        session = AuthSession(
            user_id=user.id,
            expires_at=datetime.now(UTC) + timedelta(minutes=settings.session_lifetime_minutes),
        )
        self.db.add(session)
        self.db.flush()
        self.db.commit()
        return user, create_access_token(user.id, user.role, session.id)

    def revoke_session(self, session_id: str) -> None:
        session = self.db.get(AuthSession, session_id)
        if session and not session.revoked_at:
            session.revoked_at = datetime.now(UTC)
            self.db.commit()

    def verify_email(self, token: str) -> User:
        user = self.db.scalar(select(User).where(User.email_verification_token_hash == hash_token(token)))
        if not user:
            raise api_error("NOT_FOUND", "Token za potvrdu nije pronađen.", 404)
        if not user.email_verification_expires_at or _as_utc(user.email_verification_expires_at) < datetime.now(UTC):
            raise api_error("TOKEN_EXPIRED", "Token za potvrdu je istekao.", 400)
        user.email_verified_at = datetime.now(UTC)
        user.email_verification_token_hash = None
        user.email_verification_expires_at = None
        user.status = "active"
        self.db.commit()
        self.db.refresh(user)
        return user

    def start_password_reset(self, email: str) -> None:
        user = self.db.scalar(select(User).where(User.email == email.lower()))
        if not user:
            return
        token = generate_token()
        user.password_reset_token_hash = hash_token(token)
        user.password_reset_expires_at = datetime.now(UTC) + timedelta(hours=PASSWORD_RESET_TOKEN_HOURS)
        self.db.commit()
        reset_url = f"{settings.app_url.rstrip('/')}/reset-lozinke?token={token}"
        enqueue_email(
            self.db,
            user.email,
            "Reset lozinke - Sve Za Pecanje",
            f"Postavite novu lozinku otvaranjem linka: {reset_url}",
            html=render_action_email(
                "Reset lozinke",
                f"Zdravo {user.username}, primili smo zahtev za promenu lozinke na vašem nalogu.",
                "Postavi novu lozinku",
                reset_url,
            ),
        )
        self.db.commit()

    def reset_password(self, token: str, new_password: str) -> None:
        user = self.db.scalar(select(User).where(User.password_reset_token_hash == hash_token(token)))
        if not user:
            raise api_error("NOT_FOUND", "Token za reset lozinke nije pronađen.", 404)
        if not user.password_reset_expires_at or _as_utc(user.password_reset_expires_at) < datetime.now(UTC):
            raise api_error("TOKEN_EXPIRED", "Token za reset lozinke je istekao.", 400)
        user.password_hash = hash_password(new_password)
        user.password_reset_token_hash = None
        user.password_reset_expires_at = None
        self.db.query(AuthSession).filter(AuthSession.user_id == user.id, AuthSession.revoked_at.is_(None)).update(
            {"revoked_at": datetime.now(UTC)}
        )
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
