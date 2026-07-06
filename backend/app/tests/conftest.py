from datetime import UTC, datetime, timedelta
from decimal import Decimal
from itertools import count

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.api.v1.deps import get_db
from app.core.security import hash_password
from app.db.base import Base
from app.main import app
from app.models import Category, Listing, User, UserProfile

_ids = count(1)


@pytest.fixture()
def db(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}", connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, class_=Session)
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture()
def client(db):
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def factories(db):
    class Factories:
        def user(self, email: str | None = None, username: str | None = None, role: str = "user") -> User:
            index = next(_ids)
            user = User(
                email=email or f"user{index}@example.com",
                username=username or f"user{index}",
                password_hash=hash_password("StrongPassword123!"),
                role=role,
                status="active",
                email_verified_at=datetime.now(UTC),
            )
            user.profile = UserProfile(display_name=user.username)
            db.add(user)
            db.commit()
            db.refresh(user)
            return user

        def category(self, slug: str | None = None, name: str | None = None) -> Category:
            index = next(_ids)
            category = Category(
                slug=slug or f"category-{index}",
                name_sr=name or f"Kategorija {index}",
                name_en=name or f"Category {index}",
                is_active=True,
            )
            db.add(category)
            db.commit()
            db.refresh(category)
            return category

        def listing(
            self,
            seller: User,
            category: Category,
            title: str | None = None,
            price: int = 1000,
            condition: str = "used_good",
            attributes: dict | None = None,
            status: str = "active",
        ) -> Listing:
            index = next(_ids)
            public_id = f"pub{index}"
            listing = Listing(
                public_id=public_id,
                seller_id=seller.id,
                category_id=category.id,
                title=title or f"Oglas {index}",
                slug=f"oglas-{index}",
                description="Dovoljno dug opis oglasa za testiranje filtera i detalja.",
                condition=condition,
                price_amount=Decimal(price),
                currency="RSD",
                city="Beograd",
                status=status,
                attributes=attributes or {},
                allow_messages=True,
                phone_visible=False,
                expires_at=datetime.now(UTC) + timedelta(days=30),
            )
            db.add(listing)
            db.commit()
            db.refresh(listing)
            return listing

    return Factories()


@pytest.fixture()
def login_user(client):
    def _login(user: User) -> None:
        response = client.post(
            "/api/v1/auth/login",
            json={"email": user.email, "password": "StrongPassword123!"},
        )
        assert response.status_code == 200

    return _login
