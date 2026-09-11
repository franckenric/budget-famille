from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps
from app.crud.base import parse_json_list

router = APIRouter()


def _budget_check(db: Session, budget_id: str, current_user: models.Users):
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


def _debt_for_user(
    db: Session, debt_id: str, current_user: models.Users
) -> models.Debts:
    debt = crud.debts.get(db, id=debt_id)
    if not debt or debt.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Debt not found")
    if debt.user_id == current_user.id:
        return debt
    # Les dettes familiales sont visibles pour tous les membres
    budget = crud.budgets.get(db, id=debt.budget_id) if debt.budget_id else None
    if (
        budget is not None
        and budget.family_id is not None
        and budget.family_id == current_user.family_id
    ):
        return debt
    raise HTTPException(status_code=403, detail="Not enough permissions")


@router.get("/", response_model=schemas.ResponseDebts)
def read_debts(
    *,
    offset: int = 0,
    limit: int = 100,
    month: str = None,
    db: Session = Depends(deps.get_db),
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """Retrieve all global debts for the current user (not tied to a month)."""
    debt_wheres = [{"key": "user_id", "value": current_user.id, "operator": "=="}]
    items = crud.debts.get_multi_where_array(
        db, skip=offset, limit=limit, where=debt_wheres
    )
    items.sort(key=lambda d: d.debt_date, reverse=True)
    return schemas.ResponseDebts(
        **{"count": len(items), "data": jsonable_encoder(items)}
    )


@router.post("/", response_model=schemas.Debts)
def create_debt(
    *,
    db: Session = Depends(deps.get_db),
    debt_in: schemas.DebtsCreate,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """Create a new global debt (borrowing)."""
    if debt_in.budget_id:
        _budget_check(db, debt_in.budget_id, current_user)
    return crud.debts.create(db, obj_in=debt_in, user_id=current_user.id)


@router.get("/{debt_id}", response_model=schemas.Debts)
def read_debt(
    *,
    db: Session = Depends(deps.get_db),
    debt_id: str,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """Get a debt by ID."""
    return _debt_for_user(db, debt_id, current_user)


@router.put("/{debt_id}", response_model=schemas.Debts)
def update_debt(
    *,
    db: Session = Depends(deps.get_db),
    debt_id: str,
    debt_in: schemas.DebtsUpdate,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """Update a debt."""
    debt = _debt_for_user(db, debt_id, current_user)
    return crud.debts.update(db, db_obj=debt, obj_in=debt_in)


@router.post("/{debt_id}/payments", response_model=schemas.Debts)
def record_debt_payment(
    *,
    db: Session = Depends(deps.get_db),
    debt_id: str,
    payment: schemas.DebtPayment,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """Record a real payment with its date."""
    debt = _debt_for_user(db, debt_id, current_user)
    payments = list(debt.payments or [])
    payments.append({"date": payment.date.isoformat(), "amount": payment.amount})
    total_paid = sum(p["amount"] for p in payments)
    update = schemas.DebtsUpdate(
        payments=payments,
        is_repaid=total_paid >= debt.amount,
        repaid_date=payment.date if total_paid >= debt.amount else None,
    )
    return crud.debts.update(db, db_obj=debt, obj_in=update)


@router.delete("/{debt_id}/payments/{payment_index}", response_model=schemas.Debts)
def remove_debt_payment(
    *,
    db: Session = Depends(deps.get_db),
    debt_id: str,
    payment_index: int,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """Remove a recorded payment (undo)."""
    debt = _debt_for_user(db, debt_id, current_user)
    payments = list(debt.payments or [])
    if payment_index < 0 or payment_index >= len(payments):
        raise HTTPException(status_code=400, detail="Invalid payment index")
    del payments[payment_index]
    total_paid = sum(p["amount"] for p in payments)
    update = schemas.DebtsUpdate(
        payments=payments,
        is_repaid=total_paid >= debt.amount,
        repaid_date=None if total_paid < debt.amount else debt.repaid_date,
    )
    return crud.debts.update(db, db_obj=debt, obj_in=update)


@router.patch("/{debt_id}/repay", response_model=schemas.Debts)
def toggle_repay_debt(
    *,
    db: Session = Depends(deps.get_db),
    debt_id: str,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """Toggle debt repayment status."""
    from datetime import date as date_type

    debt = _debt_for_user(db, debt_id, current_user)
    next_repaid = not debt.is_repaid
    update = schemas.DebtsUpdate(
        is_repaid=next_repaid,
        repaid_date=date_type.today() if next_repaid else None,
    )
    return crud.debts.update(db, db_obj=debt, obj_in=update)


@router.delete("/{debt_id}", response_model=schemas.Msg)
def delete_debt(
    *,
    db: Session = Depends(deps.get_db),
    debt_id: str,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """Delete a debt."""
    _debt_for_user(db, debt_id, current_user)
    crud.debts.remove(db, id=debt_id)
    return schemas.Msg(msg="Debt deleted successfully")
