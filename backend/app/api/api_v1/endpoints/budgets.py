from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps
from app.crud.base import parse_json_list

router = APIRouter()


def _get_budget_for_user(
    db: Session, budget_id: str, current_user: models.Users
) -> models.Budgets:
    budget = crud.budgets.get(db, id=budget_id)
    if not budget or budget.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Budget not found")
    allowed = budget.user_id == current_user.id or (
        budget.family_id is not None
        and budget.family_id == current_user.family_id
    )
    if not allowed:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return budget


@router.get("/summary", response_model=schemas.ResponseBudgetSummary)
def read_budget_summary(
    *,
    month: str,
    db: Session = Depends(deps.get_db),
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Récapitulatif du budget mensuel de l'utilisateur courant.
    """
    budget = crud.budgets.get_by_user_month(
        db, user_id=current_user.id, month=month
    )
    if not budget:
        raise HTTPException(status_code=404, detail="No budget for this month")
    return schemas.ResponseBudgetSummary(data=crud.budgets.summary(db, budget))


@router.post("/ensure", response_model=schemas.Budgets)
def ensure_budget(
    *,
    month: str,
    db: Session = Depends(deps.get_db),
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Récupère le budget du mois, ou le crée s'il n'existe pas (idempotent).
    """
    budget = crud.budgets.get_or_create(
        db,
        user_id=current_user.id,
        month=month,
        family_id=current_user.family_id,
    )
    # Les charges récurrentes (gabarits) sont reproposées automatiquement.
    crud.fixed_charges.materialize_for_budget(db, budget=budget)
    return budget


@router.get("/stats", response_model=schemas.CategoryStats)
def read_budget_stats(
    *,
    month: str,
    db: Session = Depends(deps.get_db),
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Statistiques du mois : totaux par catégorie (camembert) et par jour (ligne).
    """
    budget = crud.budgets.get_by_user_month(
        db, user_id=current_user.id, month=month
    )
    if not budget:
        return schemas.CategoryStats(
            month=month, total_variable=0.0, categories=[], daily=[]
        )
    return crud.budgets.category_stats(db, budget.id)


@router.get("/compare", response_model=schemas.MonthComparison)
def compare_months(
    *,
    limit: int = 6,
    db: Session = Depends(deps.get_db),
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Comparaison mois par mois des budgets précédents.
    """
    return schemas.MonthComparison(
        months=crud.budgets.month_comparison(db, user_id=current_user.id, limit=limit)
    )


@router.get("/", response_model=schemas.ResponseBudgets)
def read_budgets(
    *,
    offset: int = 0,
    limit: int = 20,
    relation: str = "[]",
    where: str = "[]",
    base_columns: str = "[]",
    db: Session = Depends(deps.get_db),
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve budgets du user courant.
    """
    wheres = [{"key": "user_id", "value": current_user.id, "operator": "=="}]
    wheres.extend(parse_json_list(where))
    items = crud.budgets.get_multi_where_array(
        db=db,
        skip=offset,
        limit=limit,
        relations=parse_json_list(relation),
        where=wheres,
        base_columns=parse_json_list(base_columns),
    )
    count = crud.budgets.get_count_where_array(db=db, where=wheres)
    return schemas.ResponseBudgets(
        **{"count": count, "data": jsonable_encoder(items)}
    )


@router.post("/", response_model=schemas.Budgets)
def create_budget(
    *,
    db: Session = Depends(deps.get_db),
    budget_in: schemas.BudgetsCreate,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create a new monthly budget for the current user.
    """
    existing = crud.budgets.get_by_user_month(
        db, user_id=current_user.id, month=budget_in.month
    )
    if existing:
        raise HTTPException(
            status_code=400, detail="A budget already exists for this month"
        )
    return crud.budgets.create(
        db,
        obj_in=budget_in,
        user_id=current_user.id,
        family_id=current_user.family_id,
    )


@router.put("/{budget_id}", response_model=schemas.Budgets)
def update_budget(
    *,
    db: Session = Depends(deps.get_db),
    budget_id: str,
    budget_in: schemas.BudgetsUpdate,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update a budget (capital, seuils, blocage).
    """
    budget = _get_budget_for_user(db, budget_id, current_user)
    return crud.budgets.update(db, db_obj=budget, obj_in=budget_in)


@router.delete("/{budget_id}", response_model=schemas.Msg)
def delete_budget(
    *,
    db: Session = Depends(deps.get_db),
    budget_id: str,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Delete a budget.
    """
    budget = _get_budget_for_user(db, budget_id, current_user)
    crud.budgets.remove(db, id=budget_id)
    return schemas.Msg(msg="Budget deleted successfully")


@router.get("/{budget_id}", response_model=schemas.Budgets)
def read_budget(
    *,
    db: Session = Depends(deps.get_db),
    budget_id: str,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get a budget with its charges and expenses.
    """
    budget = _get_budget_for_user(db, budget_id, current_user)
    budget = crud.budgets.get(
        db, id=budget_id, relations=["fixed_charges", "variable_expenses"]
    )
    return budget