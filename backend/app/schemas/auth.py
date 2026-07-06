from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=60, pattern=r"^[a-zA-Z0-9_.-]+$")
    password: str = Field(min_length=8, max_length=128)
    accepted_terms: bool

    @field_validator("accepted_terms")
    @classmethod
    def terms_must_be_true(cls, value: bool) -> bool:
        if not value:
            raise ValueError("Morate prihvatiti uslove korišćenja.")
        return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class VerifyEmailRequest(BaseModel):
    token: str


class AuthUser(BaseModel):
    id: str
    email: EmailStr
    username: str
    role: str
    status: str
    email_verified: bool
    created_at: datetime


class AuthResponse(BaseModel):
    user: AuthUser
