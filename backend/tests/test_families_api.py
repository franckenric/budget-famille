def test_create_and_join_family(client, register_user, auth_headers):
    # user 1 crée la famille
    created = client.post("/api/v1/families/", headers=auth_headers, json={"name": "Ma Famille"})
    assert created.status_code == 200, created.text
    family = created.json()
    assert family["owner_user_id"] is not None
    assert family["invite_code"]

    # user 2 rejoint avec le code
    register_user(email="membre@test.com")
    resp = client.post(
        "/api/v1/login/access-token",
        data={"username": "membre@test.com", "password": "secret123"},
    )
    member_headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}

    joined = client.post(
        "/api/v1/families/join",
        headers=member_headers,
        json={"invite_code": family["invite_code"]},
    )
    assert joined.status_code == 200, joined.text
    assert len(joined.json()["members"]) == 2

    # la liste des membres
    family_view = client.get("/api/v1/families/me", headers=auth_headers)
    assert family_view.status_code == 200
    members = family_view.json()["members"]
    assert len(members) == 2
    roles = {m["role"]: m for m in members}
    assert "admin" in roles and "member" in roles


def test_family_summary_aggregates(client, register_user, auth_headers):
    family = client.post(
        "/api/v1/families/", headers=auth_headers, json={"name": "Foyer"}
    ).json()

    register_user(email="membre@test.com")
    token = client.post(
        "/api/v1/login/access-token",
        data={"username": "membre@test.com", "password": "secret123"},
    ).json()["access_token"]
    member_headers = {"Authorization": f"Bearer {token}"}
    client.post(
        "/api/v1/families/join",
        headers=member_headers,
        json={"invite_code": family["invite_code"]},
    )

    # chaque membre crée son budget mensuel
    for headers in (auth_headers, member_headers):
        budget = client.post("/api/v1/budgets/ensure?month=2026-09", headers=headers).json()
        client.put(f"/api/v1/budgets/{budget['id']}", headers=headers, json={"capital": 500})
        client.post(
            "/api/v1/variable_expenses/",
            headers=headers,
            json={"budget_id": budget["id"], "title": "Courses",
                  "amount": 100, "expense_date": "2026-09-01", "category": "alimentation"},
        )

    summary = client.get("/api/v1/families/me/summary?month=2026-09", headers=auth_headers)
    assert summary.status_code == 200
    body = summary.json()
    assert body["member_count"] == 2
    assert body["total_capital"] == 1000
    assert body["total_spent"] == 200
    assert body["percent_spent"] == 20


def test_update_member_role_admin_only(client, register_user, auth_headers):
    family = client.post(
        "/api/v1/families/", headers=auth_headers, json={"name": "Foyer"}
    ).json()
    register_user(email="membre@test.com")
    token = client.post(
        "/api/v1/login/access-token",
        data={"username": "membre@test.com", "password": "secret123"},
    ).json()["access_token"]
    member_headers = {"Authorization": f"Bearer {token}"}
    client.post(
        "/api/v1/families/join",
        headers=member_headers,
        json={"invite_code": family["invite_code"]},
    )
    member_user = client.get("/api/v1/users/me", headers=member_headers).json()

    # le membre ne peut pas changer de rôle
    resp = client.patch(
        f"/api/v1/families/me/members/{member_user['id']}",
        headers=member_headers,
        json={"role": "admin"},
    )
    assert resp.status_code in (400, 403)

    # l'admin le peut
    resp = client.patch(
        f"/api/v1/families/me/members/{member_user['id']}",
        headers=auth_headers,
        json={"role": "admin"},
    )
    assert resp.status_code == 200
    assert resp.json()["role"] == "admin"