from typing import Any, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.budgets import Budgets
from app.models.fixed_charges import FixedChargeTemplates, FixedCharges
from app.schemas.fixed_charges import FixedChargesCreate, FixedChargesUpdate


class CRUDFixedCharges(CRUDBase[FixedCharges, FixedChargesCreate, FixedChargesUpdate]):
    def get_by_field(self, db: Session, *, field: str, value: Any) -> Optional[FixedCharges]:
        return db.query(FixedCharges).filter(getattr(FixedCharges, field) == value).first()

    def mark_paid(self, db: Session, *, charge: FixedCharges, is_paid: bool) -> FixedCharges:
        charge.is_paid = is_paid
        db.add(charge)
        db.commit()
        db.refresh(charge)
        return charge

    def materialize_for_budget(self, db: Session, *, budget: Budgets) -> int:
        """Repropose chaque gabarit récurrent sous forme d'occurrence du mois.

        Idempotent : une occurrence existante pour (gabarit, budget) est ignorée.
        """
        templates = (
            db.query(FixedChargeTemplates)
            .filter(
                FixedChargeTemplates.user_id == budget.user_id,
                FixedChargeTemplates.deleted_at.is_(None),
            )
            .all()
        )
        created = 0
        for template in templates:
            exists = (
                db.query(FixedCharges.id)
                .filter(
                    FixedCharges.budget_id == budget.id,
                    FixedCharges.template_id == template.id,
                    FixedCharges.deleted_at.is_(None),
                )
                .first()
            )
            if exists:
                continue
            db.add(
                FixedCharges(
                    budget_id=budget.id,
                    template_id=template.id,
                    month=budget.month,
                    name=template.name,
                    amount=template.default_amount,
                    due_day=template.due_day,
                    category=template.category,
                    is_paid=False,
                )
            )
            created += 1
        if created:
            db.commit()
        return created

    def materialize_for_user(self, db: Session, *, user_id: str) -> int:
        """Applique les gabarits récurrents à tous les budgets mensuels existants."""
        budgets = (
            db.query(Budgets)
            .filter(
                Budgets.user_id == user_id,
                Budgets.deleted_at.is_(None),
            )
            .all()
        )
        total = 0
        for budget in budgets:
            total += self.materialize_for_budget(db, budget=budget)
        return total

    def remove_by_template(self, db: Session, *, template_id: str) -> int:
        """Supprime (soft) toutes les occurrences d'un gabarit."""
        rows = (
            db.query(FixedCharges)
            .filter(
                FixedCharges.template_id == template_id,
                FixedCharges.deleted_at.is_(None),
            )
            .all()
        )
        for row in rows:
            row.deleted_at = func.now()
        if rows:
            db.commit()
        return len(rows)

    def absorb_orphan_charges(
        self,
        db: Session,
        *,
        user_id: str,
        template,
    ) -> int:
        """Rattache au gabarit les occurrences « orphelines » existantes de même
        nom/catégorie (charges saisies mois par mois avant les gabarits), afin
        qu'elles deviennent récurrentes sans être dupliquées.

        Les montants déjà saisis chaque mois sont conservés.
        """
        budget_ids = [
            b.id
            for b in db.query(Budgets.id)
            .filter(
                Budgets.user_id == user_id,
                Budgets.deleted_at.is_(None),
            )
            .all()
        ]
        if not budget_ids:
            return 0
        orphans = (
            db.query(FixedCharges)
            .filter(
                FixedCharges.budget_id.in_(budget_ids),
                FixedCharges.template_id.is_(None),
                FixedCharges.deleted_at.is_(None),
                FixedCharges.name == template.name,
                FixedCharges.category == template.category,
            )
            .all()
        )
        for row in orphans:
            row.template_id = template.id
        if orphans:
            db.commit()
        return len(orphans)


fixed_charges = CRUDFixedCharges(FixedCharges)