def _budget(client, headers, month="2026-09"):
    resp = client.post(f"/api/v1/budgets/ensure?month={month}", headers=headers)
    assert resp.status_code == 200
    return resp.json()["id"]


def test_crud_variable_expense(client, auth_headers):
    budget_id = _budget(client, auth_headers)
    created = client.post(
        "/api/v1/variable_expenses/",
        headers=auth_headers,
        json={
            "budget_id": budget_id,
            "title": "Essence",
            "amount": 45,
            "expense_date": "2026-09-04",
            "category": "transport",
            "description": "Plein du lundi",
        },
    )
    assert created.status_code == 200, created.text
    exp_id = created.json()["id"]
    assert created.json()["category"] == "transport"
    assert created.json()["user_id"] is not None

    listed = client.get(
        "/api/v1/variable_expenses/?month=2026-09&category=transport",
        headers=auth_headers,
    )
    assert listed.status_code == 200
    assert listed.json()["count"] == 1

    filtered_empty = client.get(
        "/api/v1/variable_expenses/?month=2026-09&category=sante",
        headers=auth_headers,
    )
    assert filtered_empty.json()["count"] == 0

    updated = client.put(
        f"/api/v1/variable_expenses/{exp_id}",
        headers=auth_headers,
        json={"amount": 50, "description": "Plein du mardi"},
    )
    assert updated.status_code == 200
    assert updated.json()["amount"] == 50

    deleted = client.delete(
        f"/api/v1/variable_expenses/{exp_id}", headers=auth_headers
    )
    assert deleted.status_code == 200
    after = client.get("/api/v1/variable_expenses/?month=2026-09", headers=auth_headers)
    assert after.json()["count"] == 0


def test_date_range_filter(client, auth_headers):
    budget_id = _budget(client, auth_headers)
    client.post(
        "/api/v1/variable_expenses/",
        headers=auth_headers,
        json={"budget_id": budget_id, "title": "A", "amount": 10,
              "expense_date": "2026-09-01", "category": "autre"},
    )
    client.post(
        "/api/v1/variable_expenses/",
        headers=auth_headers,
        json={"budget_id": budget_id, "title": "B", "amount": 20,
              "expense_date": "2026-09-20", "category": "autre"},
    )
    resp = client.get(
        "/api/v1/variable_expenses/?from_date=2026-09-10&to_date=2026-09-30",
        headers=auth_headers,
    )
    assert resp.json()["count"] == 1
    assert resp.json()["data"][0]["title"] == "B"