def _ensure_budget(client, headers, month="2026-09", capital=1000):
    resp = client.post(
        f"/api/v1/budgets/ensure?month={month}", headers=headers
    )
    assert resp.status_code == 200, resp.text
    budget_id = resp.json()["id"]
    resp = client.put(
        f"/api/v1/budgets/{budget_id}",
        headers=headers,
        json={"capital": capital},
    )
    assert resp.status_code == 200
    return budget_id


def test_ensure_budget_is_idempotent(client, auth_headers):
    first = client.post("/api/v1/budgets/ensure?month=2026-09", headers=auth_headers)
    assert first.status_code == 200
    second = client.post("/api/v1/budgets/ensure?month=2026-09", headers=auth_headers)
    assert second.status_code == 200
    assert first.json()["id"] == second.json()["id"]
    assert first.json()["month"] == "2026-09"


def test_create_budget_duplicate_rejected(client, auth_headers):
    resp = client.post(
        "/api/v1/budgets/",
        headers=auth_headers,
        json={"month": "2026-09", "capital": 2500},
    )
    assert resp.status_code == 200
    resp2 = client.post(
        "/api/v1/budgets/",
        headers=auth_headers,
        json={"month": "2026-09", "capital": 2000},
    )
    assert resp2.status_code == 400


def test_summary_with_charges_and_expenses(client, auth_headers):
    budget_id = _ensure_budget(client, auth_headers, capital=1000)

    charge = client.post(
        "/api/v1/fixed_charges/",
        headers=auth_headers,
        json={
            "budget_id": budget_id,
            "name": "Loyer",
            "amount": 400,
            "due_day": 5,
            "category": "logement",
        },
    )
    assert charge.status_code == 200

    expense = client.post(
        "/api/v1/variable_expenses/",
        headers=auth_headers,
        json={
            "budget_id": budget_id,
            "title": "Courses",
            "amount": 100,
            "expense_date": "2026-09-10",
            "category": "alimentation",
        },
    )
    assert expense.status_code == 200

    summary = client.get(
        "/api/v1/budgets/summary?month=2026-09", headers=auth_headers
    )
    assert summary.status_code == 200
    data = summary.json()["data"]
    assert data["capital"] == 1000
    assert data["total_fixed"] == 400   # loyer non payé = planifié
    assert data["total_variable"] == 100
    assert data["total_spent"] == 100   # seul le variable compte (loyer non payé)
    assert data["alert_level"] == "none"


def test_summary_alert_levels(client, auth_headers):
    budget_id = _ensure_budget(client, auth_headers, capital=100)

    # 85% du budget → alerte rouge
    client.post(
        "/api/v1/variable_expenses/",
        headers=auth_headers,
        json={
            "budget_id": budget_id,
            "title": "Shopping",
            "amount": 85,
            "expense_date": "2026-09-01",
            "category": "shopping",
        },
    )
    summary = client.get(
        "/api/v1/budgets/summary?month=2026-09", headers=auth_headers
    ).json()["data"]
    assert summary["percent_spent"] == 85.0
    assert summary["alert_level"] == "red"


def test_stats_categories(client, auth_headers):
    budget_id = _ensure_budget(client, auth_headers, capital=500)
    for cat, amount in (("alimentation", 50), ("transport", 30), ("alimentation", 20)):
        client.post(
            "/api/v1/variable_expenses/",
            headers=auth_headers,
            json={
                "budget_id": budget_id,
                "title": cat,
                "amount": amount,
                "expense_date": "2026-09-0{amount_exp}".format(amount_exp="1"),
                "category": cat,
            },
        )
    stats = client.get("/api/v1/budgets/stats?month=2026-09", headers=auth_headers)
    assert stats.status_code == 200
    body = stats.json()
    by_cat = {c["category"]: c["total"] for c in body["categories"]}
    assert by_cat["alimentation"] == 70
    assert by_cat["transport"] == 30
    assert body["total_variable"] == 100
    assert len(body["daily"]) == 1


def test_compare_months(client, auth_headers):
    _ensure_budget(client, auth_headers, month="2026-07", capital=800)
    _ensure_budget(client, auth_headers, month="2026-08", capital=900)
    compare = client.get("/api/v1/budgets/compare?limit=6", headers=auth_headers)
    assert compare.status_code == 200
    months = compare.json()["months"]
    assert len(months) == 2
    assert {m["month"] for m in months} == {"2026-07", "2026-08"}