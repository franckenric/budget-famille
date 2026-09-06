from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps

router = APIRouter()


def _get_template_for_user(
    db: Session, template_id: str, current_user: models.Users
) -> models.FixedChargeTemplates:
    template = crud.fixed_charge_templates.get(db, id=template_id)
    if not template or template.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Fixed charge template not found")
    if template.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return template


@router.get("/", response_model=schemas.ResponseFixedChargeTemplates)
def read_fixed_charge_templates(
    *,
    limit: int = 200,
    db: Session = Depends(deps.get_db),
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Gabarits récurrents de charges fixes de l'utilisateur courant.
    """
    items = crud.fixed_charge_templates.get_by_user_id(db, user_id=current_user.id)
    return schemas.ResponseFixedChargeTemplates(
        **{"count": len(items), "data": jsonable_encoder(items)}
    )


@router.post("/", response_model=schemas.FixedChargeTemplates)
def create_fixed_charge_template(
    *,
    db: Session = Depends(deps.get_db),
    template_in: schemas.FixedChargeTemplatesCreate,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Crée un gabarit récurrent et le repropose aux mois déjà existants.
    """
    template = crud.fixed_charge_templates.create(
        db, obj_in=template_in, user_id=current_user.id
    )
    # Rattache les charges mensuelles existantes de même nom (ancien modèle
    # « saisie chaque mois ») pour éviter les doublons, puis repropose le gabarit.
    crud.fixed_charges.absorb_orphan_charges(
        db, user_id=current_user.id, template=template
    )
    crud.fixed_charges.materialize_for_user(db, user_id=current_user.id)
    return template


@router.put("/{template_id}", response_model=schemas.FixedChargeTemplates)
def update_fixed_charge_template(
    *,
    db: Session = Depends(deps.get_db),
    template_id: str,
    template_in: schemas.FixedChargeTemplatesUpdate,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Met à jour le gabarit (le montant par défaut n'écrase pas les
    montants déjà saisis pour les mois précédents).
    """
    template = _get_template_for_user(db, template_id, current_user)
    return crud.fixed_charge_templates.update(
        db, db_obj=template, obj_in=template_in
    )


@router.delete("/{template_id}", response_model=schemas.Msg)
def delete_fixed_charge_template(
    *,
    db: Session = Depends(deps.get_db),
    template_id: str,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Supprime le gabarit et toutes ses occurrences (tous les mois).
    """
    _get_template_for_user(db, template_id, current_user)
    crud.fixed_charge_templates.remove(db, id=template_id)
    crud.fixed_charges.remove_by_template(db, template_id=template_id)
    return schemas.Msg(msg="Fixed charge template deleted successfully")