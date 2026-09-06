from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.enum.fixed_charge_category import FixedChargeCategory


class FixedChargesBase(BaseModel):
    name: Optional[str] = None
    amount: Optional[float] = Field(default=None, ge=0)
    due_day: Optional[int] = Field(default=1, ge=1, le=31)
    is_paid: Optional[bool] = False
    category: Optional[FixedChargeCategory] = FixedChargeCategory.autre
    template_id: Optional[str] = None
    month: Optional[str] = None


class FixedChargesCreate(FixedChargesBase):
    budget_id: str
    name: str
    amount: float


class FixedChargesUpdate(FixedChargesBase):
    pass


class FixedChargesInDBBase(FixedChargesBase):
    id: Optional[Any] = None
    budget_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class FixedCharges(FixedChargesInDBBase):
    pass


class FixedChargesInDB(FixedChargesInDBBase):
    pass


class ChargePayIn(BaseModel):
    is_paid: bool


class ResponseFixedCharges(BaseModel):
    count: int
    data: Optional[List[FixedCharges]]


class FixedChargeTemplatesBase(BaseModel):
    name: Optional[str] = None
    default_amount: Optional[float] = Field(default=None, ge=0)
    due_day: Optional[int] = Field(default=1, ge=1, le=31)
    category: Optional[FixedChargeCategory] = FixedChargeCategory.autre


class FixedChargeTemplatesCreate(FixedChargeTemplatesBase):
    name: str
    default_amount: float


class FixedChargeTemplatesUpdate(FixedChargeTemplatesBase):
    pass


class FixedChargeTemplatesInDBBase(FixedChargeTemplatesBase):
    id: Optional[Any] = None
    user_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class FixedChargeTemplates(FixedChargeTemplatesInDBBase):
    pass


class ResponseFixedChargeTemplates(BaseModel):
    count: int
    data: Optional[List[FixedChargeTemplates]]