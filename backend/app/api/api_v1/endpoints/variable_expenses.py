from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps
from app.crud.base import parse_json_list

router = APIRouter()


def _get_expense_for_user(
    db: Session, expense_id: str, current_user: models.Users
) -> models.VariableExpenses:
    expense = crud.variable_expenses.get(db, id=expense_id)
    if not expense or expense.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Expense not found")
    budget = crud.budgets.get(db, id=expense.budget_id)
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    allowed = budget.user_id == current_user.id or (
        budget.family_id is not None
        and budget.family_id == current_user.family_id
    )
    if not allowed:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return expense


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


@router.get("/", response_model=schemas.ResponseVariableExpenses)
def read_variable_expenses(
    *,
    offset: int = 0,
    limit: int = 50,
    month: str = None,
    category: str = None,
    from_date: date = None,
    to_date: date = None,
    where: str = "[]",
    db: Session = Depends(deps.get_db),
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve variable expenses of the current user.
    Filtres pratiques : month, category, from_date, to_date.
    """
    were_list = parse_json_list(where)
    items = []
    budget_wheres = [{"key": "user_id", "value": current_user.id, "operator": "=="}]
    if month:
        budget_wheres.append({"key": "month", "value": month, "operator": "=="})
    budgets = crud.budgets.get_multi_where_array(db, where=budget_wheres, limit=500)
    for budget in budgets:
        exp_wheres = [{"key": "budget_id", "value": budget.id, "operator": "=="}]
        exp_wheres.extend(were_list)
        if category:
            exp_wheres.append({"key": "category", "value": category, "operator": "=="})
        if from_date or to_date:
            if from_date and to_date:
                exp_wheres.append(
                    {
                        "key": "expense_date",
                        "operator": "between_date",
                        "value": f"{from_date.isoformat()},{to_date.isoformat()}",
                    }
                )
            elif from_date:
                exp_wheres.append({"key": "expense_date", "operator": ">=", "value": from_date.isoformat()})
            elif to_date:
                exp_wheres.append({"key": "expense_date", "operator": "<=", "value": to_date.isoformat()})
        items.extend(
            crud.variable_expenses.get_multi_where_array(
                db,
                skip=offset,
                limit=limit,
                where=exp_wheres,
                order_by="expense_date",
                order="DESC",
            )
        )
    items.sort(key=lambda e: e.expense_date, reverse=True)
    return schemas.ResponseVariableExpenses(
        **{"count": len(items), "data": jsonable_encoder(items[:limit])}
    )


@router.post("/", response_model=schemas.VariableExpenses)
def create_variable_expense(
    *,
    db: Session = Depends(deps.get_db),
    expense_in: schemas.VariableExpensesCreate,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create a variable expense (add rapide).
    """
    _budget_check(db, expense_in.budget_id, current_user)
    return crud.variable_expenses.create(
        db, obj_in=expense_in, user_id=current_user.id
    )


@router.put("/{expense_id}", response_model=schemas.VariableExpenses)
def update_variable_expense(
    *,
    db: Session = Depends(deps.get_db),
    expense_id: str,
    expense_in: schemas.VariableExpensesUpdate,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update a variable expense.
    """
    expense = _get_expense_for_user(db, expense_id, current_user)
    return crud.variable_expenses.update(db, db_obj=expense, obj_in=expense_in)


@router.delete("/{expense_id}", response_model=schemas.Msg)
def delete_variable_expense(
    *,
    db: Session = Depends(deps.get_db),
    expense_id: str,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Delete a variable expense.
    """
    _get_expense_for_user(db, expense_id, current_user)
    crud.variable_expenses.remove(db, id=expense_id)
    return schemas.Msg(msg="Expense deleted successfully")


@router.get("/{expense_id}", response_model=schemas.VariableExpenses)
def read_variable_expense(
    *,
    db: Session = Depends(deps.get_db),
    expense_id: str,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get a variable expense by ID.
    """
    return _get_expense_for_user(db, expense_id, current_user)