import csv
import io
from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps

router = APIRouter()


def _get_budget_or_404(db: Session, month: str, current_user: models.Users):
    budget = crud.budgets.get_by_user_month(
        db, user_id=current_user.id, month=month
    )
    if not budget:
        raise HTTPException(status_code=404, detail="No budget for this month")
    return budget


def _csv_response(rows: List[List[str]], filename: str):
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerows(rows)
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}.csv"'
        },
    )


def _build_pdf(title: str, headers: List[str], rows: List[List[str]]) -> bytes:
    from fpdf import FPDF

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, title, ln=True)
    pdf.ln(4)
    pdf.set_font("Helvetica", "B", 10)
    for h in headers:
        pdf.cell(40, 8, h, border=1)
    pdf.ln()
    pdf.set_font("Helvetica", "", 9)
    for row in rows:
        for cell in row:
            pdf.cell(40, 8, str(cell)[:40], border=1)
        pdf.ln()
    return pdf.output()


def _pdf_response(title: str, headers: List[str], rows: List[List[str]], filename: str):
    data = _build_pdf(title, headers, rows)
    return StreamingResponse(
        iter([data]),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}.pdf"'
        },
    )


@router.get("/{entity}")
def export_data(
    *,
    entity: str,
    month: str,
    format: str = "csv",
    db: Session = Depends(deps.get_db),
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Export de l'historique : entity = expenses | charges | summary.
    format = csv | pdf.
    """
    format = format.lower()
    if format not in ("csv", "pdf"):
        raise HTTPException(status_code=400, detail="format must be csv or pdf")

    budget = _get_budget_or_404(db, month, current_user)
    filename = f"budget_famille_{entity}_{month}"

    if entity == "summary":
        s = crud.budgets.summary(db, budget)
        headers = ["month", "capital", "total_fixed", "total_variable", "total_spent",
                   "remaining", "percent_spent", "alert_level"]
        rows = [[str(getattr(s, h)) for h in headers]]
        rows.insert(0, headers)
        rows = [headers, [s.month, s.capital, s.total_fixed, s.total_variable,
                          s.total_spent, s.remaining, s.percent_spent, s.alert_level]]
        title = f"Budget {month}"
        if format == "csv":
            return _csv_response(rows, filename)
        return _pdf_response(title=title, headers=headers, rows=rows[1:], filename=filename)

    if entity == "expenses":
        expenses = crud.variable_expenses.get_multi_where_array(
            db, where=[{"key": "budget_id", "value": budget.id, "operator": "=="}],
            limit=1000, order_by="expense_date",
        )
        headers = ["date", "title", "category", "amount", "description", "recurring"]
        rows = [
            [
                e.expense_date.isoformat() if e.expense_date else "",
                e.title,
                e.category.value if e.category else "",
                str(e.amount),
                e.description or "",
                "oui" if e.is_recurring else "non",
            ]
            for e in expenses
        ]
        title = f"Dépenses variables — {month}"
    elif entity == "charges":
        charges = crud.fixed_charges.get_multi_where_array(
            db, where=[{"key": "budget_id", "value": budget.id, "operator": "=="}],
            limit=1000, order_by="name",
        )
        headers = ["name", "category", "amount", "due_day", "is_paid"]
        rows = [
            [
                c.name,
                c.category.value if c.category else "",
                str(c.amount),
                str(c.due_day),
                "payé" if c.is_paid else "en attente",
            ]
            for c in charges
        ]
        title = f"Charges fixes — {month}"
    else:
        raise HTTPException(status_code=400, detail="entity must be expenses, charges or summary")

    if format == "csv":
        return _csv_response([headers] + rows, filename)
    return _pdf_response(title=title, headers=headers, rows=rows, filename=filename)