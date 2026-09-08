from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps
from app.enum.role_type import FamilyRoleType

router = APIRouter()


def _get_my_family(db: Session, current_user: models.Users) -> Optional[models.Families]:
    if not current_user.family_id:
        return None
    family = crud.families.get(db, id=current_user.family_id)
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")
    return family


def _to_member_out(member: models.FamilyMembers) -> schemas.FamilyMembersOut:
    return schemas.FamilyMembersOut(
        id=member.id,
        user_id=member.user_id,
        family_id=member.family_id,
        role=member.role,
        is_active=member.is_active,
        email=member.user.email if member.user else None,
        full_name=member.user.full_name if member.user else None,
    )


@router.get("/me", response_model=Optional[schemas.FamiliesWithMembers])
def read_my_family(
    *,
    db: Session = Depends(deps.get_db),
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Fetch la famille du user courant avec ses membres.
    Renvoie null si le user n'est dans aucune famille.
    """
    family = _get_my_family(db, current_user)
    if not family:
        return None
    members = crud.family_members.list_with_user(db, family_id=family.id)
    return schemas.FamiliesWithMembers(
        id=family.id,
        name=family.name,
        owner_user_id=family.owner_user_id,
        invite_code=family.invite_code,
        members=[_to_member_out(m) for m in members],
    )


@router.get("/me/summary")
def read_family_summary(
    *,
    month: str,
    db: Session = Depends(deps.get_db),
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Agrégation du budget des membres de la famille pour un mois donné.
    """
    family = _get_my_family(db, current_user)
    if not family:
        raise HTTPException(
            status_code=404, detail="User is not part of any family"
        )
    members = crud.family_members.list_with_user(db, family_id=family.id)
    member_budgets = []
    total_capital = 0.0
    total_fixed = 0.0
    total_variable = 0.0
    total_spent = 0.0

    for member in members:
        budget = crud.budgets.get_by_user_month(
            db, user_id=member.user_id, month=month
        )
        if not budget:
            continue
        s = crud.budgets.summary(db, budget)
        total_capital += s.capital
        total_fixed += s.total_fixed
        total_variable += s.total_variable
        total_spent += s.total_spent
        member_budgets.append(
            {
                "member_id": member.user_id,
                "full_name": member.user.full_name if member.user else "Membre",
                "capital": s.capital,
                "total_spent": s.total_spent,
            }
        )

    percent_spent = (total_spent / total_capital * 100) if total_capital > 0 else 0
    return {
        "month": month,
        "family_id": family.id,
        "family_name": family.name,
        "member_count": len(member_budgets),
        "total_capital": total_capital,
        "total_fixed": total_fixed,
        "total_variable": total_variable,
        "total_spent": total_spent,
        "percent_spent": round(percent_spent, 2),
        "members": member_budgets,
    }


@router.post("/", response_model=schemas.Families)
def create_family(
    *,
    db: Session = Depends(deps.get_db),
    family_in: schemas.FamiliesCreate,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Créer une famille (le user devient admin). Un user ne peut être
    que dans une seule famille.
    """
    if current_user.family_id:
        raise HTTPException(
            status_code=400, detail="User already belongs to a family"
        )
    return crud.families.create_family(db, owner=current_user, name=family_in.name)


@router.post("/join", response_model=schemas.FamiliesWithMembers)
def join_family(
    *,
    db: Session = Depends(deps.get_db),
    join_in: schemas.FamiliesJoinIn,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Rejoindre une famille grâce à son code d'invitation.
    """
    if current_user.family_id:
        raise HTTPException(
            status_code=400, detail="User already belongs to a family"
        )
    family = crud.families.join_family(
        db, user=current_user, invite_code=join_in.invite_code
    )
    if not family:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    members = crud.family_members.list_with_user(db, family_id=family.id)
    return schemas.FamiliesWithMembers(
        id=family.id,
        name=family.name,
        owner_user_id=family.owner_user_id,
        invite_code=family.invite_code,
        members=[_to_member_out(m) for m in members],
    )


@router.get("/", response_model=schemas.ResponseFamilies)
def read_families(
    *,
    db: Session = Depends(deps.get_db),
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Liste des familles visibles (dont celle du user courant).
    """
    families = crud.families.get_multi_where_array(db, limit=50)
    return schemas.ResponseFamilies(
        **{"count": len(families), "data": [f for f in families]}
    )


@router.patch("/me/members/{user_id}", response_model=schemas.FamilyMembersOut)
def update_member_role(
    *,
    db: Session = Depends(deps.get_db),
    user_id: str,
    update_in: schemas.FamilyMembersUpdate,
    current_user: models.Users = Depends(deps.get_current_family_admin),
) -> Any:
    """
    Change le rôle d'un membre (admin uniquement).
    """
    if not current_user.family_id:
        raise HTTPException(status_code=404, detail="User is not part of any family")
    member = crud.family_members.get_by_user_and_family(
        db, family_id=current_user.family_id, user_id=user_id
    )
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    if update_in.role is not None:
        member.role = FamilyRoleType(update_in.role)
        db.add(member)
        db.commit()
        db.refresh(member)
    return _to_member_out(member)