from datetime import date
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.enum.variable_category import VariableCategory


class ExpenseDetail(BaseModel):
    description: str
    quantity: float = Field(ge=0)
    unit_price: float = Field(ge=0)


class VariableExpensesBase(BaseModel):
    title: Optional[str] = None
    amount: Optional[float] = Field(default=None, ge=0)
    expense_date: Optional[date] = None
    category: Optional[VariableCategory] = VariableCategory.autre
    description: Optional[str] = None
    photo_url: Optional[str] = None
    is_recurring: Optional[bool] = False
    details: Optional[List[ExpenseDetail]] = None


class VariableExpensesCreate(VariableExpensesBase):
    budget_id: str
    title: str
    amount: float
    expense_date: date


class VariableExpensesUpdate(VariableExpensesBase):
    pass


class VariableExpensesInDBBase(VariableExpensesBase):
    id: Optional[Any] = None
    budget_id: Optional[str] = None
    user_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class VariableExpenses(VariableExpensesInDBBase):
    pass


class VariableExpensesInDB(VariableExpensesInDBBase):
    pass


class ResponseVariableExpenses(BaseModel):
    count: int
    data: Optional[List[VariableExpenses]]


class CategoryStatItem(BaseModel):
    category: str
    total: float
    count: int


class DailyStatItem(BaseModel):
    date: str
    total: float
    count: int


class CategoryStats(BaseModel):
    month: str
    total_variable: float
    categories: List[CategoryStatItem]
    daily: List[DailyStatItem]


class CompareItem(BaseModel):
    month: str
    capital: float
    total_fixed: float
    total_variable: float
    total_spent: float


class MonthComparison(BaseModel):
    months: List[CompareItem]