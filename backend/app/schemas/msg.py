from typing import Any, List, Optional
from pydantic import BaseModel

from .budgets import Budgets
from .fixed_charges import FixedChargeTemplates, FixedCharges
from .variable_expenses import VariableExpenses


class Msg(BaseModel):
    msg: str


class SyncPullResult(BaseModel):
    since: str
    budgets: Optional[List[Budgets]] = None
    fixed_charges: Optional[List[FixedCharges]] = None
    fixed_charge_templates: Optional[List[FixedChargeTemplates]] = None
    variable_expenses: Optional[List[VariableExpenses]] = None
    server_time: Optional[str] = None


class SyncPushItem(BaseModel):
    entity: str  # budget | fixed_charge | variable_expense
    id: str
    action: str = "upsert"  # upsert | delete
    data: Optional[dict] = None


class SyncPushRequest(BaseModel):
    items: List[SyncPushItem]


class SyncPushResultItem(BaseModel):
    id: str
    entity: str
    status: str  # accepted | conflict | error
    reason: Optional[str] = None


class SyncPushResponse(BaseModel):
    accepted: int
    conflicts: int
    errors: int
    results: List[SyncPushResultItem]