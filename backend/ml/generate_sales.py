import random
from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.database.database import SessionLocal
from app.models.product import Product
from app.models.warehouse import Warehouse
from app.models.sale import Sale


# Base daily demand for known products.
# If a product is not listed here, 20 units/day will be used.
BASE_DEMAND = {
    "keyboard": 15,
    "mouse": 30,
    "earbuds": 25,
    "laptop": 10,
    "smart watch": 12,
    "smartwatch": 12,
}


def get_base_demand(product: Product) -> int:
    name = (product.name or "").strip().lower()

    return BASE_DEMAND.get(name, 20)


def generate_sales():
    db: Session = SessionLocal()

    try:
        products = (
            db.query(Product)
            .order_by(Product.id)
            .all()
        )

        warehouses = (
            db.query(Warehouse)
            .order_by(Warehouse.id)
            .all()
        )

        if not products:
            print("No products found.")
            return

        if not warehouses:
            print("No warehouses found.")
            return

        # Generate 90 days of historical sales.
        start_date = date.today() - timedelta(days=90)

        inserted_records = 0
        skipped_records = 0

        for warehouse in warehouses:
            for product in products:

                base_demand = get_base_demand(product)

                for day_number in range(90):
                    current_date = (
                        start_date
                        + timedelta(days=day_number)
                    )

                    # Prevent duplicate sales records.
                    existing_sale = (
                        db.query(Sale)
                        .filter(
                            Sale.product_id == product.id,
                            Sale.warehouse_id == warehouse.id,
                            Sale.sale_date == current_date,
                        )
                        .first()
                    )

                    if existing_sale:
                        skipped_records += 1
                        continue

                    # Gradual demand growth.
                    trend = 1 + (
                        day_number / 90
                    ) * 0.15

                    # Lower demand on weekends.
                    if current_date.weekday() >= 5:
                        weekend_factor = 0.80
                    else:
                        weekend_factor = 1.0

                    # Small warehouse-specific variation.
                    # Keeps demand different across warehouses.
                    warehouse_factor = (
                        0.90
                        + (warehouse.id % 5) * 0.05
                    )

                    # Random variation.
                    random_factor = random.uniform(
                        0.80,
                        1.20,
                    )

                    quantity = int(
                        base_demand
                        * trend
                        * weekend_factor
                        * warehouse_factor
                        * random_factor
                    )

                    quantity = max(quantity, 1)

                    sale = Sale(
                        product_id=product.id,
                        warehouse_id=warehouse.id,
                        sale_date=current_date,
                        quantity=quantity,
                    )

                    db.add(sale)
                    inserted_records += 1

        db.commit()

        print(
            f"Successfully inserted "
            f"{inserted_records} sales records."
        )

        print(
            f"Skipped {skipped_records} existing records."
        )

        print(
            f"Products processed: {len(products)}"
        )

        print(
            f"Warehouses processed: {len(warehouses)}"
        )

    except Exception as error:
        db.rollback()
        print("Error generating sales:", error)

    finally:
        db.close()


if __name__ == "__main__":
    generate_sales()