import random
from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.database.database import SessionLocal
from app.models.product import Product
from app.models.warehouse import Warehouse
from app.models.sale import Sale

# Our existing products
PRODUCTS = {
    1: "Keyboard",
    2: "Mouse",
    3: "earbuds",
}

# Our existing warehouse
WAREHOUSE_ID = 1


# Base daily demand for each product
BASE_DEMAND = {
    1: 15,  # Keyboard
    2: 30,  # Mouse
    3: 25,  # Earbuds
}


def generate_sales():
    db: Session = SessionLocal()

    try:
        # Generate 90 days of historical data
        start_date = date.today() - timedelta(days=90)

        sales = []

        for day_number in range(90):
            current_date = start_date + timedelta(days=day_number)

            # Gradual demand growth over time
            trend = 1 + (day_number / 90) * 0.15

            # Weekend effect
            if current_date.weekday() >= 5:
                weekend_factor = 0.80
            else:
                weekend_factor = 1.0

            for product_id, product_name in PRODUCTS.items():

                base_demand = BASE_DEMAND[product_id]

                # Random variation
                random_factor = random.uniform(0.80, 1.20)

                quantity = int(
                    base_demand
                    * trend
                    * weekend_factor
                    * random_factor
                )

                # Make sure quantity is at least 1
                quantity = max(quantity, 1)

                sale = Sale(
                    product_id=product_id,
                    warehouse_id=WAREHOUSE_ID,
                    sale_date=current_date,
                    quantity=quantity,
                )

                sales.append(sale)

        db.add_all(sales)
        db.commit()

        print(f"Successfully inserted {len(sales)} sales records.")

    except Exception as e:
        db.rollback()
        print("Error:", e)

    finally:
        db.close()


if __name__ == "__main__":
    generate_sales()
