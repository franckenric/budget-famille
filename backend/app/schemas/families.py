from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field

from .family_members import FamilyMembersOut


class FamiliesBase(BaseModel):
    name: Optional[str] = None


class FamiliesCreate(FamiliesBase):
    name: str


class FamiliesUpdate(FamiliesBase):
    pass


class FamiliesInDBBase(FamiliesBase):
    id: Optional[Any] = None
    owner_user_id: Optional[str] = None
    invite_code: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class Families(FamiliesInDBBase):
    pass


class FamiliesWithMembers(FamiliesInDBBase):
    members: Optional[List[FamilyMembersOut]] = None


class FamiliesJoinIn(BaseModel):
    invite_code: str = Field(min_length=4, max_length=20)


class ResponseFamilies(BaseModel):
    count: int
    data: Optional[List[FamiliesWithMembers]]