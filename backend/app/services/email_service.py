from sqlalchemy.orm import Session

from app.core.email import enqueue_email


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

    def send_new_message(self, to_email: str, listing_title: str, sender_username: str) -> None:
        enqueue_email(
            self.db,
            to_email,
            f'Nova poruka za oglas "{listing_title}"',
            f'Korisnik {sender_username} vam je poslao poruku za oglas "{listing_title}".',
        )
