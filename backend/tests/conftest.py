import os

# Les tests utilisent une base SQLite jetable (aucun serveur MySQL requis).
os.environ["SQLALCHEMY_DATABASE_URI"] = "sqlite:///./test_budget_famille.db"
os.environ["TESTING"] = "1"
os.environ["SECRET_KEY"] = "test-secret-key-for-pytest"

import pytest
from fastapi.testclient import TestClient

from main import app
from app.db.base import Base
from app.db.init_db import init_db
from app.db.session import SessionLocal, engine


@pytest.fixture(scope="session", autouse=True)
def _setup_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    init_db(db)
    db.close()
    yield


@pytest.fixture(autouse=True)
def _clean_tables(_setup_database):
    yield
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    init_db(db)
    db.close()


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def register_user(client):
    def _register(email="user@test.com", password="secret123", full_name="Test User", **kw):
        resp = client.post(
            "/api/v1/login/register",
            json={
                "email": email,
                "password": password,
                "full_name": full_name,
                **kw,
            },
        )
        assert resp.status_code == 200, resp.text
        return resp.json()
    return _register


@pytest.fixture()
def auth_headers(client, register_user):
    user = register_user()
    resp = client.post(
        "/api/v1/login/access-token",
        data={"username": user["email"], "password": "secret123"},
    )
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}