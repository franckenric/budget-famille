from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from .families import Families
from .roles import Roles


class UsersBase(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    currency: Optional[str] = "MGA"
    yellow_threshold: Optional[int] = 70
    red_threshold: Optional[int] = 85
    blocking_enabled: Optional[bool] = True


class UsersCreate(UsersBase):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str
    role_name: Optional[str] = "member"
    family_id: Optional[str] = None
    invite_code: Optional[str] = None
    is_active: bool = True


class UsersUpdate(UsersBase):
    password: Optional[str] = None


class UsersInDBBase(UsersBase):
    id: Optional[Any] = None
    role_id: Optional[str] = None
    family_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class Users(UsersInDBBase):
    pass


class UsersWithRelation(UsersInDBBase):
    role: Optional[Roles] = None
    family: Optional[Families] = None


class UsersInDB(UsersInDBBase):
    pass


class UsersMeOut(UsersWithRelation):
    role_name: Optional[str] = None


class ResponseUsers(BaseModel):
    count: int
    data: Optional[List[UsersWithRelation]]