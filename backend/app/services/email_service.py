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
        self.send_promotion_started(recipient, listing_title, "Isticanje oglasa", featured_until)

    def send_promotion_started(
        self,
        recipient: User,
        listing_title: str,
        promotion_label: str,
        ends_at: datetime | None,
    ) -> None:
        unsubscribe_url = self._unsubscribe_url(recipient)
        until_text = f" i traje do {ends_at.strftime('%d.%m.%Y')}" if ends_at else ""
        enqueue_email(
            self.db,
            recipient.email,
            f'{promotion_label} za oglas "{listing_title}" je aktivna',
            (
                f'{promotion_label} za oglas "{listing_title}" je aktivirana{until_text}.\n\n'
                f"Odjava od email notifikacija: {unsubscribe_url}"
            ),
        )

    def send_shop_subscription_started(self, recipient: User, shop_name: str, ends_at: datetime) -> None:
        unsubscribe_url = self._unsubscribe_url(recipient)
        enqueue_email(
            self.db,
            recipient.email,
            f'Prodavnica "{shop_name}" je aktivna',
            (
                f'Pretplata za prodavnicu "{shop_name}" je aktivirana i traje do {ends_at.strftime("%d.%m.%Y")}.\n\n'
                f"Prodavnicu možete urediti na {settings.app_url}/nalog/prodavnica.\n"
                f"Odjava od email notifikacija: {unsubscribe_url}"
            ),
        )

    def send_shop_subscription_expiring(self, recipient: User, shop_name: str, ends_at: datetime) -> None:
        unsubscribe_url = self._unsubscribe_url(recipient)
        enqueue_email(
            self.db,
            recipient.email,
            f'Pretplata za prodavnicu "{shop_name}" uskoro ističe',
            (
                f'Pretplata za prodavnicu "{shop_name}" ističe {ends_at.strftime("%d.%m.%Y")}. '
                f"Produženje možete zatražiti na {settings.app_url}/nalog/prodavnica.\n\n"
                f"Odjava od email notifikacija: {unsubscribe_url}"
            ),
        )

    def _unsubscribe_url(self, user: User) -> str:
        token = generate_token()
        user.email_unsubscribe_token_hash = hash_token(token)
        return f"{settings.api_url.rstrip('/')}/notifications/unsubscribe/{token}"
