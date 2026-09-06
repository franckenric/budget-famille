from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict


class RolesBase(BaseModel):
    name: Optional[str] = None


class RolesCreate(RolesBase):
    name: str


class RolesUpdate(RolesBase):
    pass


class RolesInDBBase(RolesBase):
    id: Optional[Any] = None

    model_config = ConfigDict(from_attributes=True)


class Roles(RolesInDBBase):
    pass


class RolesInDB(RolesInDBBase):
    pass