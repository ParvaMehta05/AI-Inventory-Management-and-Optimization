from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.channel_order import ChannelOrder
from app.models.inventory import Inventory
from app.models.order import Order
from app.models.product import Product
from app.models.warehouse import Warehouse
from app.schemas.webhook import OrderWebhook


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

    IMPORTANT:
    The channel UI does not modify inventory directly. This endpoint is the
    synchronization boundary. It validates the event, prevents duplicate
    processing, reduces central inventory, and records the order.
    """

    supported_channels = {"amazon", "flipkart", "shopify"}

    if payload.channel not in supported_channels:
        raise HTTPException(
            status_code=400,
            detail="Unsupported sales channel",
        )

    supported_statuses = {"PLACED"}

    if payload.status not in supported_statuses:
        raise HTTPException(
            status_code=400,
            detail="Unsupported order status. Only PLACED orders are supported.",
        )

    # Idempotency: if the marketplace retries the same webhook, do not
    # subtract stock a second time.
    existing_event = db.query(ChannelOrder).filter(
        ChannelOrder.order_id == payload.order_id
    ).first()

    if existing_event is not None:
        return {
            "status": "already_processed",
            "message": "This channel order has already been processed.",
            "order_id": existing_event.order_id,
            "channel": existing_event.channel,
            "quantity": existing_event.quantity,
        }

    product = db.query(Product).filter(
        Product.id == payload.product_id
    ).first()

    if product is None:
        raise HTTPException(
            status_code=404,
            detail="Product not found",
        )

    warehouse = db.query(Warehouse).filter(
        Warehouse.id == payload.warehouse_id
    ).first()

    if warehouse is None:
        raise HTTPException(
            status_code=404,
            detail="Warehouse not found",
        )

    # Lock the inventory row during the transaction so concurrent orders
    # cannot both read the same old stock value and oversell it.
    inventory = (
        db.query(Inventory)
        .filter(
            Inventory.product_id == payload.product_id,
            Inventory.warehouse_id == payload.warehouse_id,
        )
        .with_for_update()
        .first()
    )

    if inventory is None:
        raise HTTPException(
            status_code=404,
            detail="Inventory record not found for this product and warehouse",
        )

    if inventory.quantity < payload.quantity:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Insufficient stock. "
                f"Available: {inventory.quantity}, "
                f"Requested: {payload.quantity}"
            ),
        )

    # Central inventory is changed ONLY here.
    inventory.quantity -= payload.quantity

    # Keep the existing orders table populated so the current Admin Orders
    # screen and future sales-history/ML work can use channel-generated sales.
    new_order = Order(
        product_id=payload.product_id,
        warehouse_id=payload.warehouse_id,
        quantity=payload.quantity,
        status="completed",
    )

    channel_order = ChannelOrder(
        order_id=payload.order_id,
        channel=payload.channel,
        product_id=payload.product_id,
        warehouse_id=payload.warehouse_id,
        quantity=payload.quantity,
        status=payload.status,
    )

    db.add(new_order)
    db.add(channel_order)

    try:
        db.commit()
    except IntegrityError:
        # Handles a race where two identical webhook requests arrive at
        # nearly the same time. Roll back and return the already-processed
        # result rather than reducing stock twice.
        db.rollback()

        existing_event = db.query(ChannelOrder).filter(
            ChannelOrder.order_id == payload.order_id
        ).first()

        if existing_event is not None:
            return {
                "status": "already_processed",
                "message": "This channel order has already been processed.",
                "order_id": existing_event.order_id,
                "channel": existing_event.channel,
                "quantity": existing_event.quantity,
            }

        raise HTTPException(
            status_code=500,
            detail="Unable to process the order webhook.",
        )

    db.refresh(channel_order)

    return {
        "status": "processed",
        "message": "Order synchronized and inventory updated successfully.",
        "order_id": channel_order.order_id,
        "channel": channel_order.channel,
        "product_id": channel_order.product_id,
        "warehouse_id": channel_order.warehouse_id,
        "quantity": channel_order.quantity,
        "remaining_stock": inventory.quantity,
    }
