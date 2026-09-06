from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps
from app.crud.base import parse_json_list

router = APIRouter()


def _get_charge_for_user(
    db: Session, charge_id: str, current_user: models.Users
) -> models.FixedCharges:
    charge = crud.fixed_charges.get(db, id=charge_id)
    if not charge or charge.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Fixed charge not found")
    budget = crud.budgets.get(db, id=charge.budget_id)
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    allowed = budget.user_id == current_user.id or (
        budget.family_id is not None
        and budget.family_id == current_user.family_id
    )
    if not allowed:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return charge


@router.get("/", response_model=schemas.ResponseFixedCharges)
def read_fixed_charges(
    *,
    offset: int = 0,
    limit: int = 50,
    where: str = "[]",
    db: Session = Depends(deps.get_db),
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve fixed charges of the current user (sur ses budgets).
    """
    items = []
    where_list = parse_json_list(where)
    for budget in crud.budgets.get_multi_where_array(
        db,
        where=[
            {"key": "user_id", "value": current_user.id, "operator": "=="}
        ],
        limit=500,
    ):
        budget_wheres = [{"key": "budget_id", "value": budget.id, "operator": "=="}]
        budget_wheres.extend(where_list)
        items.extend(
            crud.fixed_charges.get_multi_where_array(
                db, skip=0, limit=limit, where=budget_wheres
            )
        )
    return schemas.ResponseFixedCharges(
        **{"count": len(items), "data": jsonable_encoder(items)}
    )


@router.post("/", response_model=schemas.FixedCharges)
def create_fixed_charge(
    *,
    db: Session = Depends(deps.get_db),
    charge_in: schemas.FixedChargesCreate,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create a fixed charge on a budget.
    """
    # vérifie l'accès au budget cible
    _get_budget_check(db, charge_in.budget_id, current_user)
    return crud.fixed_charges.create(db, obj_in=charge_in)


def _get_budget_check(db: Session, budget_id: str, current_user: models.Users):
    budget = crud.budgets.get(db, id=budget_id)
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    allowed = budget.user_id == current_user.id or (
        budget.family_id is not None
        and budget.family_id == current_user.family_id
    )
    if not allowed:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return budget


@router.put("/{charge_id}", response_model=schemas.FixedCharges)
def update_fixed_charge(
    *,
    db: Session = Depends(deps.get_db),
    charge_id: str,
    charge_in: schemas.FixedChargesUpdate,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update a fixed charge.
    """
    charge = _get_charge_for_user(db, charge_id, current_user)
    return crud.fixed_charges.update(db, db_obj=charge, obj_in=charge_in)


@router.patch("/{charge_id}/pay", response_model=schemas.FixedCharges)
def mark_charge_paid(
    *,
    db: Session = Depends(deps.get_db),
    charge_id: str,
    pay_in: schemas.ChargePayIn,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Marque une charge fixe comme payée ou en attente.
    """
    charge = _get_charge_for_user(db, charge_id, current_user)
    return crud.fixed_charges.mark_paid(db, charge=charge, is_paid=pay_in.is_paid)


@router.delete("/{charge_id}", response_model=schemas.Msg)
def delete_fixed_charge(
    *,
    db: Session = Depends(deps.get_db),
    charge_id: str,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Delete a fixed charge.
    """
    _get_charge_for_user(db, charge_id, current_user)
    crud.fixed_charges.remove(db, id=charge_id)
    return schemas.Msg(msg="Fixed charge deleted successfully")


@router.get("/{charge_id}", response_model=schemas.FixedCharges)
def read_fixed_charge(
    *,
    db: Session = Depends(deps.get_db),
    charge_id: str,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get a fixed charge by ID.
    """
    return _get_charge_for_user(db, charge_id, current_user)