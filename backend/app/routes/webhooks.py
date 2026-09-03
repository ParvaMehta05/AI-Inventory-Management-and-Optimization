from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.webhook import OrderWebhook
from app.services.synchronization import synchronize_order


router = APIRouter(
    prefix="/webhooks",
    tags=["Webhooks"],
)


@router.post("/orders")
def receive_order_webhook(
    payload: OrderWebhook,
    db: Session = Depends(get_db),
):
    """
    Receives an order event from a simulated external sales channel.

    The synchronization service handles validation, idempotency,
    inventory deduction, order creation, and transaction safety.
    """

    return synchronize_order(payload, db)