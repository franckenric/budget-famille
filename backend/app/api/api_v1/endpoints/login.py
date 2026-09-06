from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps
from app.core import security
from app.core.config import settings

router = APIRouter()


@router.post("/access-token", response_model=schemas.Token)
def login_access_token(
    db: Session = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    The 'username' field is used to pass the email address.
    """
    user = crud.users.authenticate(
        db, email=form_data.username, password=form_data.password
    )
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    token = security.create_access_token(
        sub={"id": str(user.id), "email": user.email},
        expires_delta=access_token_expires,
    )
    return {"access_token": token, "token_type": "Bearer"}


@router.post("/register", response_model=schemas.Users)
def register_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: schemas.UsersCreate,
) -> Any:
    """
    Create a new user account. Optionally join a family via invite_code.
    """
    existing = crud.users.get_by_email(db, email=user_in.email)
    if existing:
        raise HTTPException(
            status_code=400, detail="A user with this email already exists"
        )
    user = crud.users.create(db, obj_in=user_in)
    if user_in.invite_code:
        crud.families.join_family(db, user=user, invite_code=user_in.invite_code)
    return user


@router.post("/test-token/{token}", response_model=schemas.Users)
def test_token(token: str, db: Session = Depends(deps.get_db)) -> Any:
    """
    Test access token
    """
    token_data = deps.get_user(token)
    user = crud.users.get(db, id=str(token_data.id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/decode_token", response_model=schemas.TokenPayload)
def test_token_decode(token_info=Depends(deps.get_token_info)) -> Any:
    """
    Decode access token
    """
    return token_info