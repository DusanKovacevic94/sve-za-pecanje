from datetime import datetime

from sqlalchemy.orm import Session

from app.core.email import enqueue_email
from app.core.security import generate_token, hash_token
from app.core.config import settings
from app.models.user import User


class EmailService:
    def __init__(self, db: Session):
        self.db = db

    def send_listing_approved(self, to_email: str, listing_title: str) -> None:
        enqueue_email(self.db, to_email, "Vaš oglas je objavljen", f'Vaš oglas "{listing_title}" je odobren.')

    def send_listing_rejected(self, to_email: str, listing_title: str, reason: str) -> None:
        enqueue_email(
            self.db,
            to_email,
            "Vaš oglas nije odobren",
            f'Vaš oglas "{listing_title}" nije odobren. Razlog: {reason}',
        )

    def send_new_message(self, recipient: User, listing_title: str, sender_username: str) -> None:
        unsubscribe_url = self._unsubscribe_url(recipient)
        enqueue_email(
            self.db,
            recipient.email,
            f'Nova poruka za oglas "{listing_title}"',
            (
                f'Korisnik {sender_username} vam je poslao poruku za oglas "{listing_title}".\n\n'
                f"Podešavanja notifikacija: {settings.app_url}/nalog/profil\n"
                f"Odjava od email notifikacija: {unsubscribe_url}"
            ),
        )

    def send_listing_expiring(self, recipient: User, listing_id: str, listing_title: str) -> None:
        unsubscribe_url = self._unsubscribe_url(recipient)
        enqueue_email(
            self.db,
            recipient.email,
            f'Oglas "{listing_title}" uskoro ističe',
            (
                f'Vaš oglas "{listing_title}" ističe za 3 dana. '
                f"Možete ga obnoviti na {settings.app_url}/nalog/oglasi.\n\n"
                f"Odjava od email notifikacija: {unsubscribe_url}"
            ),
        )

    def send_feature_started(self, recipient: User, listing_title: str, featured_until: datetime) -> None:
        unsubscribe_url = self._unsubscribe_url(recipient)
        enqueue_email(
            self.db,
            recipient.email,
            f'Isticanje oglasa "{listing_title}" je aktivno',
            (
                f'Isticanje oglasa "{listing_title}" je aktivirano i traje do '
                f"{featured_until.strftime('%d.%m.%Y')}.\n\n"
                f"Odjava od email notifikacija: {unsubscribe_url}"
            ),
        )

    def _unsubscribe_url(self, user: User) -> str:
        token = generate_token()
        user.email_unsubscribe_token_hash = hash_token(token)
        return f"{settings.api_url.rstrip('/')}/notifications/unsubscribe/{token}"
