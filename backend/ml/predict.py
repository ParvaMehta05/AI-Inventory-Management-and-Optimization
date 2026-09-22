import joblib
import pandas as pd
from sqlalchemy import text

from app.database.database import engine


MODEL_PATH = "ml/models/demand_model.pkl"


def load_model():
    saved_model = joblib.load(MODEL_PATH)

    return saved_model["model"], saved_model["features"]


def get_latest_features(product_id: int, warehouse_id: int):
    query = text("""
        SELECT sale_date, quantity
        FROM sales
        WHERE product_id = :product_id
          AND warehouse_id = :warehouse_id
        ORDER BY sale_date ASC
    """)

    with engine.connect() as connection:
        df = pd.read_sql(
            query,
            connection,
            params={
                "product_id": product_id,
                "warehouse_id": warehouse_id,
            },
        )

    if len(df) < 14:
        raise ValueError(
            "At least 14 days of sales history are required."
        )

    df["sale_date"] = pd.to_datetime(df["sale_date"])

    # Latest demand values
    lag_1 = df["quantity"].iloc[-1]
    lag_7 = df["quantity"].iloc[-8]

    # Previous 7 days
    rolling_mean_7 = df["quantity"].iloc[-8:-1].mean()
    rolling_std_7 = df["quantity"].iloc[-8:-1].std()

    # Previous 14 days
    rolling_mean_14 = df["quantity"].iloc[-15:-1].mean()

    prediction_date = df["sale_date"].iloc[-1] + pd.Timedelta(days=1)

    day_of_week = prediction_date.dayofweek
    day_of_month = prediction_date.day
    month = prediction_date.month

    trend = len(df)

    return {
        "product_id": product_id,
        "warehouse_id": warehouse_id,
        "day_of_week": day_of_week,
        "day_of_month": day_of_month,
        "month": month,
        "lag_1": lag_1,
        "lag_7": lag_7,
        "rolling_mean_7": rolling_mean_7,
        "rolling_mean_14": rolling_mean_14,
        "rolling_std_7": rolling_std_7,
        "trend": trend,
    }


def predict_product_demand(
    product_id: int,
    warehouse_id: int,
):
    model, features = load_model()

    feature_values = get_latest_features(
        product_id,
        warehouse_id,
    )

    input_data = pd.DataFrame(
        [feature_values]
    )

    input_data = input_data[features]

    prediction = model.predict(input_data)[0]

    return max(0, prediction)


if __name__ == "__main__":

    product_id = 1
    warehouse_id = 1

    prediction = predict_product_demand(
        product_id,
        warehouse_id,
    )

    print(
        f"Product {product_id}, "
        f"Warehouse {warehouse_id}"
    )

    print(
        f"Predicted next-day demand: "
        f"{prediction:.2f} units"
    )