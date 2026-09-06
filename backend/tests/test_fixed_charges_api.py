def _budget(client, headers, month="2026-09"):
    resp = client.post(f"/api/v1/budgets/ensure?month={month}", headers=headers)
    assert resp.status_code == 200
    return resp.json()["id"]


def test_crud_fixed_charge(client, auth_headers):
    budget_id = _budget(client, auth_headers)

    created = client.post(
        "/api/v1/fixed_charges/",
        headers=auth_headers,
        json={
            "budget_id": budget_id,
            "name": "Internet",
            "amount": 30,
            "due_day": 10,
            "category": "abonnement",
        },
    )
    assert created.status_code == 200, created.text
    charge_id = created.json()["id"]
    assert created.json()["is_paid"] is False
    assert created.json()["category"] == "abonnement"

    updated = client.put(
        f"/api/v1/fixed_charges/{charge_id}",
        headers=auth_headers,
        json={"amount": 35},
    )
    assert updated.status_code == 200
    assert updated.json()["amount"] == 35

    paid = client.patch(
        f"/api/v1/fixed_charges/{charge_id}/pay",
        headers=auth_headers,
        json={"is_paid": True},
    )
    assert paid.status_code == 200
    assert paid.json()["is_paid"] is True

    listed = client.get("/api/v1/fixed_charges/", headers=auth_headers)
    assert listed.status_code == 200
    assert listed.json()["count"] == 1

    deleted = client.delete(f"/api/v1/fixed_charges/{charge_id}", headers=auth_headers)
    assert deleted.status_code == 200

    after = client.get("/api/v1/fixed_charges/", headers=auth_headers)
    assert after.json()["count"] == 0


def test_fixed_charge_requires_own_budget(client, register_user, auth_headers):
    register_user(email="other@test.com")
    resp = client.post(
        "/api/v1/login/access-token",
        data={"username": "other@test.com", "password": "secret123"},
    )
    other_headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}

    my_budget = _budget(client, auth_headers)
    # l'autre user tente d'ajouter une charge sur mon budget
    resp = client.post(
        "/api/v1/fixed_charges/",
        headers=other_headers,
        json={"budget_id": my_budget, "name": "Intrusion", "amount": 1},
    )
    assert resp.status_code == 403