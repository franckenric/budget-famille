def _budget(client, headers, month="2026-09"):
    resp = client.post(f"/api/v1/budgets/ensure?month={month}", headers=headers)
    assert resp.status_code == 200
    return resp.json()["id"]


def test_recurring_template_auto_materializes(client, auth_headers):
    # Gabarit créé AVANT le budget : l'occurrence doit apparaître sur chaque mois.
    template = client.post(
        "/api/v1/fixed_charge_templates/",
        headers=auth_headers,
        json={
            "name": "Loyer",
            "default_amount": 400,
            "due_day": 5,
            "category": "logement",
        },
    )
    assert template.status_code == 200, template.text
    template_id = template.json()["id"]

    b1 = _budget(client, auth_headers, month="2026-09")
    b2 = _budget(client, auth_headers, month="2026-10")

    charges = client.get("/api/v1/fixed_charges/", headers=auth_headers).json()["data"]
    occ = [c for c in charges if c["template_id"] == template_id]
    assert len(occ) == 2
    assert sorted(c["month"] for c in occ) == ["2026-09", "2026-10"]
    assert all(c["is_paid"] is False for c in occ)

    # Idempotent : re-créer le budget ne duplique pas.
    _budget(client, auth_headers, month="2026-09")
    charges = client.get("/api/v1/fixed_charges/", headers=auth_headers).json()["data"]
    sep_occ = [c for c in charges if c["template_id"] == template_id and c["month"] == "2026-09"]
    assert len(sep_occ) == 1


def test_template_default_does_not_override_monthly_amount(client, auth_headers):
    b = _budget(client, auth_headers, month="2026-09")
    template = client.post(
        "/api/v1/fixed_charge_templates/",
        headers=auth_headers,
        json={
            "name": "EDF",
            "default_amount": 80,
            "due_day": 3,
            "category": "energie",
        },
    ).json()

    charges = client.get("/api/v1/fixed_charges/", headers=auth_headers).json()["data"]
    occ = next(c for c in charges if c["template_id"] == template["id"])
    updated = client.put(
        f"/api/v1/fixed_charges/{occ['id']}",
        headers=auth_headers,
        json={"amount": 95},
    )
    assert updated.status_code == 200

    client.put(
        f"/api/v1/fixed_charge_templates/{template['id']}",
        headers=auth_headers,
        json={"default_amount": 120},
    )
    after = client.get(
        f"/api/v1/fixed_charges/{occ['id']}", headers=auth_headers
    ).json()
    assert after["amount"] == 95


def test_delete_template_removes_occurrences(client, auth_headers):
    _budget(client, auth_headers, month="2026-09")
    template = client.post(
        "/api/v1/fixed_charge_templates/",
        headers=auth_headers,
        json={
            "name": "Internet",
            "default_amount": 30,
            "due_day": 10,
            "category": "abonnement",
        },
    ).json()

    charges = client.get("/api/v1/fixed_charges/", headers=auth_headers).json()["data"]
    assert any(c["template_id"] == template["id"] for c in charges)

    resp = client.delete(
        f"/api/v1/fixed_charge_templates/{template['id']}", headers=auth_headers
    )
    assert resp.status_code == 200

    charges = client.get("/api/v1/fixed_charges/", headers=auth_headers).json()["data"]
    assert not any(c["template_id"] == template["id"] for c in charges)


def test_template_ownership(client, register_user, auth_headers):
    register_user(email="other@test.com")
    resp = client.post(
        "/api/v1/login/access-token",
        data={"username": "other@test.com", "password": "secret123"},
    )
    other_headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}

    template = client.post(
        "/api/v1/fixed_charge_templates/",
        headers=auth_headers,
        json={"name": "Loyer", "default_amount": 400, "due_day": 5},
    ).json()

    # un autre utilisateur ne peut pas modifier / supprimer le gabarit
    assert (
        client.put(
            f"/api/v1/fixed_charge_templates/{template['id']}",
            headers=other_headers,
            json={"default_amount": 999},
        ).status_code
        == 403
    )
    assert (
        client.delete(
            f"/api/v1/fixed_charge_templates/{template['id']}",
            headers=other_headers,
        ).status_code
        == 403
    )