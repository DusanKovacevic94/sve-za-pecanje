import argparse

from sqlalchemy import select

from app.db.base import Base
from app.db.session import SessionLocal, engine
from app import models  # noqa: F401
from app.core.security import hash_password
from app.models.profile import UserProfile
from app.models.user import User


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--email", required=True)
    parser.add_argument("--username", required=True)
    parser.add_argument("--password", required=True)
    args = parser.parse_args()

    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == args.email.lower()))
        if user:
            user.role = "admin"
            user.status = "active"
        else:
            user = User(
                email=args.email.lower(),
                username=args.username,
                password_hash=hash_password(args.password),
                role="admin",
                status="active",
            )
            user.profile = UserProfile(display_name=args.username)
            db.add(user)
        db.commit()
        print(f"Admin ready: {args.email}")


if __name__ == "__main__":
    main()

