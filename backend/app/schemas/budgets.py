import re
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator

from .fixed_charges import FixedCharges
from .variable_expenses import VariableExpenses


MONTH_PATTERN = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")


class BudgetsBase(BaseModel):
    month: Optional[str] = None
    capital: Optional[float] = Field(default=0.0, ge=0)
    currency: Optional[str] = "MGA"
    yellow_threshold: Optional[float] = Field(default=0.70, ge=0, le=1)
    red_threshold: Optional[float] = Field(default=0.85, ge=0, le=1)
    blocking_enabled: Optional[bool] = True

    @field_validator("month")
    @classmethod
    def validate_month(cls, v):
        if v is None:
            return v
        if not MONTH_PATTERN.match(v):
            raise ValueError('month doit être au format "2026-09"')
        return v


class BudgetsCreate(BudgetsBase):
    month: str
    capital: float = 0.0


class BudgetsUpdate(BudgetsBase):
    pass


class BudgetsInDBBase(BudgetsBase):
    id: Optional[Any] = None
    user_id: Optional[str] = None
    family_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class Budgets(BudgetsInDBBase):
    pass


class BudgetsWithRelation(BudgetsInDBBase):
    fixed_charges: Optional[List[FixedCharges]] = None
    variable_expenses: Optional[List[VariableExpenses]] = None


class BudgetsInDB(BudgetsInDBBase):
    pass


class ResponseBudgets(BaseModel):
    count: int
    data: Optional[List[Budgets]]


class BudgetSummary(BaseModel):
    month: str
    capital: float
    total_fixed: float
    total_variable: float
    total_spent: float
    remaining: float
    percent_spent: float
    alert_level: str  # none | yellow | red | over
    fixed_total_count: int
    fixed_paid_count: int
    variable_count: int


class ResponseBudgetSummary(BaseModel):
    data: BudgetSummary