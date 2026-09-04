import pandas as pd
from sqlalchemy import text

from app.database.database import engine


def load_sales_data():
    query = text("""
        SELECT
            product_id,
            warehouse_id,
            sale_date,
            quantity
        FROM sales
        ORDER BY product_id, warehouse_id, sale_date
    """)

    with engine.connect() as connection:
        df = pd.read_sql(query, connection)

    return df


def create_features(df):
    df["sale_date"] = pd.to_datetime(df["sale_date"])

    # Calendar features
    df["day_of_week"] = df["sale_date"].dt.dayofweek
    df["day_of_month"] = df["sale_date"].dt.day
    df["month"] = df["sale_date"].dt.month

    # Group by product and warehouse
    group = df.groupby(
        ["product_id", "warehouse_id"],
        sort=False
    )

    # Previous-day demand
    df["lag_1"] = group["quantity"].shift(1)

    # Previous-week demand
    df["lag_7"] = group["quantity"].shift(7)

    # 7-day rolling average
    df["rolling_mean_7"] = group["quantity"].transform(
        lambda x: x.shift(1).rolling(window=7).mean()
    )

    # 14-day rolling average
    df["rolling_mean_14"] = group["quantity"].transform(
        lambda x: x.shift(1).rolling(window=14).mean()
    )

    # 7-day demand variability
    df["rolling_std_7"] = group["quantity"].transform(
        lambda x: x.shift(1).rolling(window=7).std()
    )

    # Trend
    df["trend"] = group.cumcount()

    # Remove rows where historical features are unavailable
    df = df.dropna().reset_index(drop=True)

    return df


if __name__ == "__main__":
    sales_df = load_sales_data()

    print("Raw sales records:", len(sales_df))

    feature_df = create_features(sales_df)

    print("Records after feature engineering:", len(feature_df))

    print("\nFeature columns:")
    print(feature_df.columns.tolist())

    print("\nSample:")
    print(feature_df.head(10))

    # Save dataset for ML training
    feature_df.to_csv(
        "ml/data/features.csv",
        index=False
    )

    print("\nFeature dataset saved to ml/data/features.csv")