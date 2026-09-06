from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps
from app.crud.base import parse_json_list

router = APIRouter()


@router.get("/", response_model=schemas.ResponseUsers)
def read_users(
    *,
    offset: int = 0,
    limit: int = 20,
    relation: str = "[]",
    where: str = "[]",
    base_columns: str = "[]",
    db: Session = Depends(deps.get_db),
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve users.
    """
    users = crud.users.get_multi_where_array(
        db=db,
        skip=offset,
        limit=limit,
        relations=parse_json_list(relation),
        where=parse_json_list(where),
        base_columns=parse_json_list(base_columns),
    )
    count = crud.users.get_count_where_array(db=db, where=parse_json_list(where))
    return schemas.ResponseUsers(
        **{"count": count, "data": jsonable_encoder(users)}
    )


@router.get("/me", response_model=schemas.UsersMeOut)
def read_current_user(
    *,
    db: Session = Depends(deps.get_db),
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get the current authenticated user profile.
    """
    role_name = None
    if current_user.role:
        role_name = current_user.role.name
    obj = schemas.UsersWithRelation.model_validate(current_user)
    return schemas.UsersMeOut(**obj.model_dump(), role_name=role_name)


@router.patch("/me", response_model=schemas.Users)
def update_current_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: schemas.UsersUpdate,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update the current user profile & settings (currency, thresholds, blocking).
    """
    user = crud.users.update(db, db_obj=current_user, obj_in=user_in)
    return user


@router.post("/", response_model=schemas.Users)
def create_users(
    *,
    db: Session = Depends(deps.get_db),
    users_in: schemas.UsersCreate,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create new users.
    """
    return crud.users.create(db, obj_in=users_in)


@router.put("/{users_id}", response_model=schemas.Users)
def update_users(
    *,
    db: Session = Depends(deps.get_db),
    users_id: str,
    users_in: schemas.UsersUpdate,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update a user.
    """
    user = crud.users.get(db, id=users_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return crud.users.update(db, db_obj=user, obj_in=users_in)


@router.get("/{users_id}", response_model=schemas.Users)
def read_user(
    *,
    relation: str = "[]",
    where: str = "[]",
    base_columns: str = "[]",
    db: Session = Depends(deps.get_db),
    users_id: str,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get user by ID.
    """
    wheres = [{"key": "id", "value": users_id, "operator": "=="}]
    wheres.extend(parse_json_list(where))
    user = crud.users.get_first_where_array(
        db=db,
        relations=parse_json_list(relation),
        where=wheres,
        base_columns=parse_json_list(base_columns),
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.delete("/{users_id}", response_model=schemas.Msg)
def delete_users(
    *,
    db: Session = Depends(deps.get_db),
    users_id: str,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Delete a user.
    """
    user = crud.users.get(db, id=users_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    crud.users.remove(db, id=users_id)
    return schemas.Msg(msg="User deleted successfully")