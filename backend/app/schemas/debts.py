from datetime import date
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class DebtPayment(BaseModel):
    date: date
    amount: float


class DebtsBase(BaseModel):
    lender_name: Optional[str] = None
    amount: Optional[float] = Field(default=None, ge=0)
    reason: Optional[str] = None
    debt_date: Optional[date] = None
    monthly_amount: Optional[float] = Field(default=None, ge=0)
    start_date: Optional[date] = None
    is_repaid: Optional[bool] = False
    repaid_date: Optional[date] = None
    payments: Optional[List[Any]] = []


class DebtsCreate(DebtsBase):
    budget_id: Optional[str] = None
    lender_name: str
    amount: float
    debt_date: date


class DebtsUpdate(DebtsBase):
    pass


class DebtsInDBBase(DebtsBase):
    id: Optional[Any] = None
    budget_id: Optional[str] = None
    user_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class Debts(DebtsInDBBase):
    pass


class DebtsInDB(DebtsInDBBase):
    pass


class ResponseDebts(BaseModel):
    count: int
    data: Optional[List[Debts]]
