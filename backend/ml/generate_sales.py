import random
from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.database.database import SessionLocal
from app.models.product import Product
from app.models.warehouse import Warehouse
from app.models.sale import Sale


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
        products = db.query(Product).order_by(Product.id).all()
        warehouses = db.query(Warehouse).order_by(Warehouse.id).all()

        if not products:
            print("No products found.")
            return

        if not warehouses:
            print("No warehouses found.")
            return

        # Generate 90 days of history
        start_date = date.today() - timedelta(days=90)

        # -------------------------------------------------
        # LOAD ALL EXISTING SALES ONCE
        # -------------------------------------------------

        existing_sales = db.query(
            Sale.product_id,
            Sale.warehouse_id,
            Sale.sale_date
        ).all()

        existing_keys = {
            (
                sale.product_id,
                sale.warehouse_id,
                sale.sale_date
            )
            for sale in existing_sales
        }

        new_sales = []

        # -------------------------------------------------
        # GENERATE SALES
        # -------------------------------------------------

        for warehouse in warehouses:

            warehouse_factor = 0.90 + (warehouse.id % 5) * 0.05

            for product in products:

                base_demand = get_base_demand(product)

                for day_number in range(91):

                    current_date = (
                        start_date + timedelta(days=day_number)
                    )

                    key = (
                        product.id,
                        warehouse.id,
                        current_date
                    )

                    # Skip already existing record
                    if key in existing_keys:
                        continue

                    trend = 1 + (day_number / 90) * 0.15

                    weekend_factor = (
                        0.80
                        if current_date.weekday() >= 5
                        else 1.0
                    )

                    random_factor = random.uniform(0.80, 1.20)

                    quantity = int(
                        base_demand
                        * trend
                        * weekend_factor
                        * warehouse_factor
                        * random_factor
                    )

                    quantity = max(quantity, 1)

                    new_sales.append(
                        Sale(
                            product_id=product.id,
                            warehouse_id=warehouse.id,
                            sale_date=current_date,
                            quantity=quantity,
                        )
                    )

        # -------------------------------------------------
        # INSERT ALL RECORDS IN BULK
        # -------------------------------------------------

        if new_sales:
            db.add_all(new_sales)
            db.commit()

        print(
            f"Successfully inserted {len(new_sales)} sales records."
        )

        print(
            f"Existing records skipped: "
            f"{len(existing_sales)}"
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
        raise

    finally:
        db.close()


if __name__ == "__main__":
    generate_sales()