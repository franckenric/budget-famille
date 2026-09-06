def test_update_my_settings(client, auth_headers):
    resp = client.patch(
        "/api/v1/users/me",
        headers=auth_headers,
        json={
            "currency": "EUR",
            "yellow_threshold": 75,
            "red_threshold": 90,
            "blocking_enabled": False,
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["currency"] == "EUR"
    assert body["yellow_threshold"] == 75
    assert body["red_threshold"] == 90
    assert body["blocking_enabled"] is False


def test_list_users_requires_auth(client):
    resp = client.get("/api/v1/users/")
    assert resp.status_code == 401


def test_get_me(client, auth_headers):
    resp = client.get("/api/v1/users/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["email"] is not None


def test_update_password(client, register_user, auth_headers):
    resp = client.patch(
        "/api/v1/users/me",
        headers=auth_headers,
        json={"password": "newpass123"},
    )
    assert resp.status_code == 200

    # l'ancien mot de passe ne fonctionne plus
    old = client.post(
        "/api/v1/login/access-token",
        data={"username": "user@test.com", "password": "secret123"},
    )
    assert old.status_code == 400

    new = client.post(
        "/api/v1/login/access-token",
        data={"username": "user@test.com", "password": "newpass123"},
    )
    assert new.status_code == 200