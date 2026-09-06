from datetime import date, datetime, timezone
from typing import Any, Dict, Optional, Tuple

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps

router = APIRouter()

ENTITY_META = {
    "budget": (models.Budgets, "user_id"),
    "fixed_charge": (models.FixedCharges, "budget_id"),
    "fixed_charge_template": (models.FixedChargeTemplates, "user_id"),
    "variable_expense": (models.VariableExpenses, "budget_id"),
}


def _parse_ts(value) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, datetime):
        dt = value
    else:
        try:
            dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except ValueError:
            return None
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def _coerce_fields(model_cls, data: Dict[str, Any]) -> Dict[str, Any]:
    fields: Dict[str, Any] = {}
    for key, value in data.items():
        if value is None or key in (
            "id",
            "created_at",
            "updated_at",
            "deleted_at",
        ):
            continue
        if key == "expense_date" and isinstance(value, str):
            fields[key] = date.fromisoformat(value[:10])
        elif key == "category" and isinstance(value, str):
            fields[key] = value
        else:
            fields[key] = value
    return fields


def _budget_access_ok(
    db: Session, budget: Optional[models.Budgets], current_user: models.Users
) -> bool:
    if not budget:
        return False
    return budget.user_id == current_user.id or (
        budget.family_id is not None and budget.family_id == current_user.family_id
    )


def _target_budget(
    db: Session, entity: str, data: Dict[str, Any], current_user: models.Users
) -> Optional[models.Budgets]:
    if entity == "budget":
        budget = crud.budgets.get(db, id=data.get("id"))
        if budget and budget.user_id == current_user.id:
            return budget
        return None
    budget_id = data.get("budget_id")
    if not budget_id:
        return None
    budget = crud.budgets.get(db, id=budget_id)
    return budget if _budget_access_ok(db, budget, current_user) else None


@router.post("/push", response_model=schemas.SyncPushResponse)
def sync_push(
    *,
    db: Session = Depends(deps.get_db),
    payload: schemas.SyncPushRequest,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Synchronisation locale → serveur (upsert / delete) avec gestion
    de conflits basée sur updated_at (dernière écriture gagnante).
    """
    accepted = 0
    conflicts = 0
    errors = 0
    results: list = []

    for item in payload.items:
        meta = ENTITY_META.get(item.entity)
        if not meta:
            errors += 1
            results.append(schemas.SyncPushResultItem(
                id=item.id, entity=item.entity, status="error", reason="unknown entity"
            ))
            continue
        model_cls, _ = meta
        crud_obj = {
            "budget": crud.budgets,
            "fixed_charge": crud.fixed_charges,
            "fixed_charge_template": crud.fixed_charge_templates,
            "variable_expense": crud.variable_expenses,
        }[item.entity]

        try:
            existing = crud_obj.get(db, id=item.id)

            if item.action == "delete":
                if existing:
                    crud_obj.remove(db, id=item.id)
                    accepted += 1
                    results.append(schemas.SyncPushResultItem(
                        id=item.id, entity=item.entity, status="accepted"
                    ))
                else:
                    results.append(schemas.SyncPushResultItem(
                        id=item.id, entity=item.entity, status="accepted"
                    ))
                continue

            data = item.data or {}
            client_ts = _parse_ts(data.get("updated_at"))

            if existing:
                if client_ts and existing.updated_at and existing.updated_at > client_ts:
                    conflicts += 1
                    results.append(schemas.SyncPushResultItem(
                        id=item.id, entity=item.entity, status="conflict",
                        reason="client data older than server"
                    ))
                    continue
                fields = _coerce_fields(model_cls, data)
                for key, value in fields.items():
                    setattr(existing, key, value)
                db.add(existing)
                accepted += 1
                results.append(schemas.SyncPushResultItem(
                    id=item.id, entity=item.entity, status="accepted"
                ))
            else:
                budget = _target_budget(db, item.entity, data, current_user)
                # un budget ne peut être créé que pour soi-même ; charges et
                # dépenses doivent référencer un budget accessible.
                if item.entity == "variable_expense":
                    budget = _target_budget(db, item.entity, data, current_user)
                    if not budget:
                        errors += 1
                        results.append(schemas.SyncPushResultItem(
                            id=item.id, entity=item.entity, status="error",
                            reason="budget not accessible"
                        ))
                        continue
                    fields = _coerce_fields(model_cls, data)
                    fields["user_id"] = current_user.id
                    new_obj = model_cls(id=item.id, **fields)
                    db.add(new_obj)
                    accepted += 1
                    results.append(schemas.SyncPushResultItem(
                        id=item.id, entity=item.entity, status="accepted"
                    ))
                elif item.entity == "fixed_charge":
                    if not budget:
                        errors += 1
                        results.append(schemas.SyncPushResultItem(
                            id=item.id, entity=item.entity, status="error",
                            reason="budget not accessible"
                        ))
                        continue
                    fields = _coerce_fields(model_cls, data)
                    new_obj = model_cls(id=item.id, **fields)
                    db.add(new_obj)
                    accepted += 1
                    results.append(schemas.SyncPushResultItem(
                        id=item.id, entity=item.entity, status="accepted"
                    ))
                elif item.entity == "fixed_charge_template":
                    if not data.get("user_id") or data["user_id"] != current_user.id:
                        errors += 1
                        results.append(schemas.SyncPushResultItem(
                            id=item.id, entity=item.entity, status="error",
                            reason="cannot create template for another user"
                        ))
                        continue
                    fields = _coerce_fields(model_cls, data)
                    new_obj = model_cls(id=item.id, **fields)
                    db.add(new_obj)
                    db.flush()
                    # Même comportement que l'endpoint : on rattache les anciennes
                    # occurrences orphelines de même nom puis on repropose le mois.
                    try:
                        crud.fixed_charges.absorb_orphan_charges(
                            db, user_id=current_user.id, template=new_obj
                        )
                        crud.fixed_charges.materialize_for_user(
                            db, user_id=current_user.id
                        )
                    except Exception:
                        db.rollback()
                        db.add(new_obj)
                        db.flush()
                    accepted += 1
                    results.append(schemas.SyncPushResultItem(
                        id=item.id, entity=item.entity, status="accepted"
                    ))
                else:  # budget
                    if not data.get("user_id") or data["user_id"] != current_user.id:
                        errors += 1
                        results.append(schemas.SyncPushResultItem(
                            id=item.id, entity=item.entity, status="error",
                            reason="cannot create budget for another user"
                        ))
                        continue
                    fields = _coerce_fields(model_cls, data)
                    new_obj = model_cls(id=item.id, **fields)
                    db.add(new_obj)
                    accepted += 1
                    results.append(schemas.SyncPushResultItem(
                        id=item.id, entity=item.entity, status="accepted"
                    ))
        except Exception as exc:  # pragma: no cover
            db.rollback()
            errors += 1
            results.append(schemas.SyncPushResultItem(
                id=item.id, entity=item.entity, status="error", reason=str(exc)
            ))

    db.commit()
    return schemas.SyncPushResponse(
        accepted=accepted, conflicts=conflicts, errors=errors, results=results
    )


@router.get("/pull", response_model=schemas.SyncPullResult)
def sync_pull(
    *,
    since: str = None,
    db: Session = Depends(deps.get_db),
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Synchronisation serveur → local : renvoie budgets, charges fixes et
    dépenses variables du user courant (et de sa famille).
    """
    since_dt = _parse_ts(since)

    budgets = crud.budgets.get_multi_where_array(
        db,
        where=[{"key": "user_id", "value": current_user.id, "operator": "=="}],
        limit=1000,
    )

    fixed_charges = []
    variable_expenses = []
    for budget in budgets:
        fixed_charges.extend(
            crud.fixed_charges.get_multi_where_array(
                db, where=[{"key": "budget_id", "value": budget.id, "operator": "=="}],
                limit=1000,
            )
        )
        variable_expenses.extend(
            crud.variable_expenses.get_multi_where_array(
                db, where=[{"key": "budget_id", "value": budget.id, "operator": "=="}],
                limit=1000,
            )
        )

    fixed_charge_templates = crud.fixed_charge_templates.get_multi_where_array(
        db,
        where=[{"key": "user_id", "value": current_user.id, "operator": "=="}],
        limit=1000,
    )

    def _after(objs, attr="updated_at"):
        if not since_dt:
            return objs
        return [o for o in objs if _parse_ts(getattr(o, attr, None)) and _parse_ts(getattr(o, attr)) >= since_dt]

    budgets = _after(budgets)
    fixed_charges = _after(fixed_charges)
    fixed_charge_templates = _after(fixed_charge_templates)
    variable_expenses = _after(variable_expenses)

    return schemas.SyncPullResult(
        since=since or "",
        budgets=budgets,
        fixed_charges=fixed_charges,
        fixed_charge_templates=fixed_charge_templates,
        variable_expenses=variable_expenses,
        server_time=datetime.utcnow().isoformat(),
    )