from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.transfer import StockTransfer
from app.schemas.transfer import (
    TransferExecute,
    TransferResponse,
    TransferSuggestion,
)
from app.services.redistribution import (
    execute_transfer,
    generate_suggestions,
)


router = APIRouter(
    prefix="/redistribution",
    tags=["Redistribution"],
)


@router.get(
    "/suggestions",
    response_model=list[TransferSuggestion],
)
def get_suggestions(
    product_id: int | None = None,
    db: Session = Depends(get_db),
):
    """
    Analyse current stock levels and return recommended transfers.

    Read-only. Pass ?product_id=<id> to scope the analysis to one product.
    """

    return generate_suggestions(db, product_id)


@router.post("/execute")
def run_transfer(
    payload: TransferExecute,
    db: Session = Depends(get_db),
):
    """
    Perform an approved transfer between two warehouses.

    Validation, row locking, and transaction safety are handled
    by the redistribution service.
    """

    return execute_transfer(payload, db)


@router.get(
    "/transfers",
    response_model=list[TransferResponse],
)
def get_transfer_history(
    db: Session = Depends(get_db),
):
    """Full audit trail of executed transfers, newest first."""

    return (
        db.query(StockTransfer)
        .order_by(StockTransfer.created_at.desc())
        .all()
    )