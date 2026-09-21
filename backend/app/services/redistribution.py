from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.inventory import Inventory
from app.models.product import Product
from app.models.transfer import StockTransfer
from app.models.warehouse import Warehouse
from app.schemas.transfer import TransferExecute


# Moves smaller than this are ignored: shipping 2 units between cities
# costs more than the stockout it prevents.
MIN_TRANSFER_QUANTITY = 5


# ---------------------------------------------------------
# SUGGESTION ENGINE
# ---------------------------------------------------------

def _suggestions_for_one_product(
    rows: list[Inventory],
    product: Product,
    warehouse_names: dict[int, str],
) -> list[dict]:
    """
    Greedy surplus-to-deficit matching for a single product.

    deficit  = reorder_level - quantity   (when stock is below target)
    surplus  = quantity - reorder_level   (stock that is safe to give away)

    Because a warehouse never donates below its own reorder_level,
    solving one deficit can never create a new one.
    """

    deficits = [
        {
            "inventory": row,
            "need": row.reorder_level - row.quantity,
        }
        for row in rows
        if row.quantity < row.reorder_level
    ]

    surpluses = [
        {
            "inventory": row,
            "available": row.quantity - row.reorder_level,
        }
        for row in rows
        if row.quantity - row.reorder_level >= MIN_TRANSFER_QUANTITY
    ]

    if not deficits or not surpluses:
        return []

    # Most urgent shortage first, largest donor first.
    deficits.sort(key=lambda item: item["need"], reverse=True)
    surpluses.sort(key=lambda item: item["available"], reverse=True)

    suggestions: list[dict] = []

    for deficit in deficits:
        remaining_need = deficit["need"]

        for surplus in surpluses:
            if remaining_need <= 0:
                break

            if surplus["available"] < MIN_TRANSFER_QUANTITY:
                continue

            move = min(remaining_need, surplus["available"])

            if move < MIN_TRANSFER_QUANTITY:
                continue

            source = surplus["inventory"]
            target = deficit["inventory"]

            suggestions.append(
                {
                    "product_id": product.id,
                    "product_sku": product.sku,
                    "from_warehouse_id": source.warehouse_id,
                    "from_warehouse_name": warehouse_names.get(
                        source.warehouse_id,
                        "Unknown",
                    ),
                    "to_warehouse_id": target.warehouse_id,
                    "to_warehouse_name": warehouse_names.get(
                        target.warehouse_id,
                        "Unknown",
                    ),
                    "quantity": move,
                    "reason": (
                        f"{warehouse_names.get(target.warehouse_id, 'Target')} "
                        f"is {deficit['need']} unit(s) below its reorder level "
                        f"of {target.reorder_level}; "
                        f"{warehouse_names.get(source.warehouse_id, 'Source')} "
                        f"holds {surplus['available']} spare unit(s)."
                    ),
                }
            )

            # Book the stock against this plan so a later deficit
            # cannot be promised the same units twice.
            surplus["available"] -= move
            remaining_need -= move

    return suggestions


def generate_suggestions(
    db: Session,
    product_id: int | None = None,
) -> list[dict]:
    """
    Scan inventory and return every recommended move.

    Nothing is written to the database: this is a read-only analysis
    the user reviews before approving.
    """

    query = db.query(Inventory)

    if product_id is not None:
        query = query.filter(Inventory.product_id == product_id)

    rows = query.all()

    if not rows:
        return []

    warehouse_names = {
        warehouse.id: warehouse.name
        for warehouse in db.query(Warehouse).all()
    }

    products = {
        product.id: product
        for product in db.query(Product).all()
    }

    # Group inventory rows by product.
    grouped: dict[int, list[Inventory]] = {}

    for row in rows:
        grouped.setdefault(row.product_id, []).append(row)

    suggestions: list[dict] = []

    for pid, product_rows in grouped.items():
        product = products.get(pid)

        if product is None:
            continue

        suggestions.extend(
            _suggestions_for_one_product(
                product_rows,
                product,
                warehouse_names,
            )
        )

    return suggestions


# ---------------------------------------------------------
# TRANSFER EXECUTION
# ---------------------------------------------------------

def execute_transfer(
    payload: TransferExecute,
    db: Session,
):
    """
    Move stock between two warehouses inside a single transaction.

    Both inventory rows are locked in ascending id order. Consistent
    lock ordering is what stops two simultaneous opposite transfers
    (A to B and B to A) from deadlocking each other.
    """

    if payload.from_warehouse_id == payload.to_warehouse_id:
        raise HTTPException(
            status_code=400,
            detail="Source and destination warehouse must be different",
        )

    product = (
        db.query(Product)
        .filter(Product.id == payload.product_id)
        .first()
    )

    if product is None:
        raise HTTPException(
            status_code=404,
            detail="Product not found",
        )

    for warehouse_id in (payload.from_warehouse_id, payload.to_warehouse_id):
        warehouse = (
            db.query(Warehouse)
            .filter(Warehouse.id == warehouse_id)
            .first()
        )

        if warehouse is None:
            raise HTTPException(
                status_code=404,
                detail=f"Warehouse {warehouse_id} not found",
            )

    # Lock every affected inventory row, lowest id first.
    locked_rows = (
        db.query(Inventory)
        .filter(
            Inventory.product_id == payload.product_id,
            Inventory.warehouse_id.in_(
                [payload.from_warehouse_id, payload.to_warehouse_id]
            ),
        )
        .order_by(Inventory.id)
        .with_for_update()
        .all()
    )

    by_warehouse = {row.warehouse_id: row for row in locked_rows}

    source = by_warehouse.get(payload.from_warehouse_id)

    if source is None:
        raise HTTPException(
            status_code=404,
            detail="Source warehouse holds no inventory record for this product",
        )

    if source.quantity < payload.quantity:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Insufficient stock at source warehouse. "
                f"Available: {source.quantity}, "
                f"Requested: {payload.quantity}"
            ),
        )

    destination = by_warehouse.get(payload.to_warehouse_id)

    # A warehouse that has never stocked this product yet gets a row.
    if destination is None:
        destination = Inventory(
            product_id=payload.product_id,
            warehouse_id=payload.to_warehouse_id,
            quantity=0,
            reorder_level=0,
        )
        db.add(destination)

    source.quantity -= payload.quantity
    destination.quantity += payload.quantity

    transfer = StockTransfer(
        product_id=payload.product_id,
        from_warehouse_id=payload.from_warehouse_id,
        to_warehouse_id=payload.to_warehouse_id,
        quantity=payload.quantity,
        reason=payload.reason,
        status="COMPLETED",
    )

    db.add(transfer)

    try:
        db.commit()

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Unable to complete the stock transfer.",
        )

    db.refresh(transfer)
    db.refresh(source)
    db.refresh(destination)

    return {
        "status": "completed",
        "message": "Stock transferred successfully.",
        "transfer_id": transfer.id,
        "product_id": transfer.product_id,
        "quantity": transfer.quantity,
        "source_remaining_stock": source.quantity,
        "destination_new_stock": destination.quantity,
    }