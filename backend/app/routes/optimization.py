from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.inventory import Inventory
from app.models.product import Product
from app.models.warehouse import Warehouse

from ml.optimization import calculate_optimization


router = APIRouter(
    prefix="/optimization",
    tags=["Optimization"]
)


@router.get("/{product_id}/{warehouse_id}")
def optimize_inventory(
    product_id: int,
    warehouse_id: int,
    lead_time_days: int = 5,
    db: Session = Depends(get_db)
):
    # Check product
    product = db.query(Product).filter(
        Product.id == product_id
    ).first()

    if product is None:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    # Check warehouse
    warehouse = db.query(Warehouse).filter(
        Warehouse.id == warehouse_id
    ).first()

    if warehouse is None:
        raise HTTPException(
            status_code=404,
            detail="Warehouse not found"
        )

    # Find inventory
    inventory = db.query(Inventory).filter(
        Inventory.product_id == product_id,
        Inventory.warehouse_id == warehouse_id
    ).first()

    if inventory is None:
        raise HTTPException(
            status_code=404,
            detail="Inventory record not found"
        )

    try:
        result = calculate_optimization(
            current_stock=inventory.quantity,
            lead_time_days=lead_time_days,
            product_id=product_id,
            warehouse_id=warehouse_id,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    return result