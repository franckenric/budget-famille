from fastapi import APIRouter

from app.api.api_v1.endpoints import (
    budgets,
    export,
    families,
    fixed_charge_templates,
    fixed_charges,
    login,
    sync,
    users,
    variable_expenses,
)

api_router = APIRouter()
api_router.include_router(login.router, prefix="/login", tags=["login"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(budgets.router, prefix="/budgets", tags=["budgets"])
api_router.include_router(
    fixed_charges.router, prefix="/fixed_charges", tags=["fixed_charges"]
)
api_router.include_router(
    fixed_charge_templates.router,
    prefix="/fixed_charge_templates",
    tags=["fixed_charge_templates"],
)
api_router.include_router(
    variable_expenses.router, prefix="/variable_expenses", tags=["variable_expenses"]
)
api_router.include_router(families.router, prefix="/families", tags=["families"])
api_router.include_router(sync.router, prefix="/sync", tags=["sync"])
api_router.include_router(export.router, prefix="/export", tags=["export"])