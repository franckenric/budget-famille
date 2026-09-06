def test_register_login_and_me(client, register_user):
    user = register_user()
    assert user["email"] == "user@test.com"
    assert user["full_name"] == "Test User"
    assert "password" not in user

    resp = client.post(
        "/api/v1/login/access-token",
        data={"username": "user@test.com", "password": "secret123"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["token_type"] == "Bearer"
    assert body["access_token"]

    headers = {"Authorization": f"Bearer {body['access_token']}"}
    me = client.get("/api/v1/users/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["email"] == "user@test.com"
    assert me.json()["currency"] == "MGA"
    assert me.json()["yellow_threshold"] == 70
    assert me.json()["role_name"] == "member"


def test_register_duplicate_email(client, register_user):
    register_user()
    resp = client.post(
        "/api/v1/login/register",
        json={"email": "user@test.com", "password": "secret123", "full_name": "X"},
    )
    assert resp.status_code == 400


def test_login_wrong_password(client, register_user):
    register_user()
    resp = client.post(
        "/api/v1/login/access-token",
        data={"username": "user@test.com", "password": "wrong"},
    )
    assert resp.status_code == 400


def test_protected_endpoint_requires_token(client):
    resp = client.get("/api/v1/users/me")
    assert resp.status_code == 401