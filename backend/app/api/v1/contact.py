from fastapi import APIRouter, Request
from pydantic import BaseModel, EmailStr, Field

from app.core.config import settings
from app.core.email import send_email
from app.core.rate_limit import check_rate_limit
from app.core.responses import data_response

router = APIRouter(prefix="/contact", tags=["contact"])


class ContactRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    subject: str = Field(min_length=3, max_length=160)
    message: str = Field(min_length=10, max_length=5000)
    website: str | None = Field(default=None, max_length=200)


@router.post("")
def submit_contact(payload: ContactRequest, request: Request):
    check_rate_limit(request, "contact", 3, 60 * 60)
    if payload.website:
        return data_response({"message": "Poruka je poslata."})
    recipient = settings.contact_email or settings.email_from
    body = (
        f"Ime: {payload.name}\n"
        f"Email: {payload.email}\n"
        f"Tema: {payload.subject}\n\n"
        f"{payload.message}"
    )
    send_email(
        recipient,
        f"Kontakt forma: {payload.subject}",
        body,
        reply_to=str(payload.email),
    )
    return data_response({"message": "Poruka je poslata."})
