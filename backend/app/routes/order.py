from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.order import Order
from app.models.product import Product
from app.models.warehouse import Warehouse
from app.models.inventory import Inventory
from app.schemas.order import OrderCreate, OrderResponse


router = APIRouter(
    prefix="/orders",
    tags=["Orders"]
)


@router.post(
    "/",
    response_model=OrderResponse
)
def create_order(
    order: OrderCreate,
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(
        Product.id == order.product_id
    ).first()

    if product is None:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    warehouse = db.query(Warehouse).filter(
        Warehouse.id == order.warehouse_id
    ).first()

    if warehouse is None:
        raise HTTPException(
            status_code=404,
            detail="Warehouse not found"
        )

    inventory = db.query(Inventory).filter(
        Inventory.product_id == order.product_id,
        Inventory.warehouse_id == order.warehouse_id
    ).first()

    if inventory is None:
        raise HTTPException(
            status_code=404,
            detail="Inventory record not found for this product and warehouse"
        )

    if inventory.quantity < order.quantity:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Insufficient stock. "
                f"Available: {inventory.quantity}, "
                f"Requested: {order.quantity}"
            )
        )

    inventory.quantity -= order.quantity

    new_order = Order(
        product_id=order.product_id,
        warehouse_id=order.warehouse_id,
        quantity=order.quantity,
        status="completed"
    )

    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    return new_order


@router.get(
    "/",
    response_model=list[OrderResponse]
)
def get_orders(
    db: Session = Depends(get_db)
):
    orders = db.query(Order).order_by(
        Order.order_date.desc()
    ).all()

    return orders


@router.get(
    "/{order_id}",
    response_model=OrderResponse
)
def get_order(
    order_id: int,
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter(
        Order.id == order_id
    ).first()

    if order is None:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )

    return order