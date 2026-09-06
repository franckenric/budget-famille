from typing import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.core import security
from app.core.config import settings
from app.db.session import SessionLocal


reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token"
)


def get_db() -> Generator:
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()


def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(reusable_oauth2),
) -> models.Users:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = schemas.TokenPayload(**payload)
    except (jwt.JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )

    user = crud.users.get(db, id=str(token_data.id))
    if not user:
        raise HTTPException(status_code=403, detail="User not found")
    return user


def get_user(token: str) -> schemas.TokenPayload:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = schemas.TokenPayload(**payload)
    except (jwt.JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    return token_data


def get_token_info(token: str = Depends(reusable_oauth2)):
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = schemas.TokenPayload(**payload)
    except (jwt.JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    return token_data


def get_current_active_user(
    current_user: models.Users = Depends(get_current_user),
) -> models.Users:
    if not crud.users.is_active(current_user):
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def get_current_membership(
    db: Session = Depends(get_db),
    current_user: models.Users = Depends(get_current_active_user),
) -> models.FamilyMembers:
    if not current_user.family_id:
        raise HTTPException(
            status_code=400, detail="User is not part of any family"
        )
    membership = crud.family_members.get_by_user_and_family(
        db, family_id=current_user.family_id, user_id=current_user.id
    )
    if not membership:
        raise HTTPException(
            status_code=403, detail="User is not a member of the family"
        )
    return membership


def get_current_family_admin(
    db: Session = Depends(get_db),
    current_user: models.Users = Depends(get_current_active_user),
) -> models.Users:
    from app.enum.role_type import FamilyRoleType

    if not current_user.family_id:
        raise HTTPException(
            status_code=400, detail="User is not part of any family"
        )
    membership = crud.family_members.get_by_user_and_family(
        db, family_id=current_user.family_id, user_id=current_user.id
    )
    if not membership or membership.role != FamilyRoleType.admin:
        raise HTTPException(
            status_code=403, detail="Requires family admin privileges"
        )
    return current_user