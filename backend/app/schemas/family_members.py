from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict

from app.enum.role_type import FamilyRoleType


class FamilyMembersBase(BaseModel):
    family_id: Optional[str] = None
    user_id: Optional[str] = None
    role: Optional[FamilyRoleType] = FamilyRoleType.member
    is_active: Optional[bool] = True


class FamilyMembersCreate(FamilyMembersBase):
    family_id: str
    user_id: str
    role: FamilyRoleType = FamilyRoleType.member


class FamilyMembersUpdate(FamilyMembersBase):
    pass


class FamilyMembersInDBBase(FamilyMembersBase):
    id: Optional[Any] = None

    model_config = ConfigDict(from_attributes=True)


class FamilyMembers(FamilyMembersInDBBase):
    pass


class FamilyMembersOut(BaseModel):
    id: Optional[Any] = None
    user_id: Optional[str] = None
    family_id: Optional[str] = None
    role: Optional[FamilyRoleType] = None
    is_active: Optional[bool] = None
    email: Optional[str] = None
    full_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class FamilyMembersInDB(FamilyMembersInDBBase):
    pass


class ResponseFamilyMembers(BaseModel):
    count: int
    data: Optional[List[FamilyMembersOut]]