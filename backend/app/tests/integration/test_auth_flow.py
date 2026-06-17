from fastapi.testclient import TestClient

from app.db.base import Base
from app.db.session import engine
from app.main import app


def test_health_endpoint():
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_register_flow(monkeypatch, tmp_path):
    Base.metadata.create_all(bind=engine)
    client = TestClient(app)
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "test@example.com",
            "username": "test_user",
            "password": "StrongPassword123!",
            "accepted_terms": True,
        },
    )
    assert response.status_code in {200, 409}

