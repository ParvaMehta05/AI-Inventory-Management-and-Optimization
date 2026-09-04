import os

import joblib
import pandas as pd

from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


DATA_PATH = "ml/data/features.csv"
MODEL_PATH = "ml/models/demand_model.pkl"


def train_model():

    # Load feature dataset
    df = pd.read_csv(DATA_PATH)

    # Make sure data is ordered chronologically
    df["sale_date"] = pd.to_datetime(df["sale_date"])

    df = df.sort_values(
        ["product_id", "warehouse_id", "sale_date"]
    ).reset_index(drop=True)

    # Features used by the model
    features = [
        "product_id",
        "warehouse_id",
        "day_of_week",
        "day_of_month",
        "month",
        "lag_1",
        "lag_7",
        "rolling_mean_7",
        "rolling_mean_14",
        "rolling_std_7",
        "trend",
    ]

    target = "quantity"

    X = df[features]
    y = df[target]

    # Time-based split
    split_index = int(len(df) * 0.8)

    X_train = X.iloc[:split_index]
    X_test = X.iloc[split_index:]

    y_train = y.iloc[:split_index]
    y_test = y.iloc[split_index:]

    print("Training records:", len(X_train))
    print("Testing records:", len(X_test))

    # Create Random Forest model
    model = RandomForestRegressor(
        n_estimators=200,
        max_depth=10,
        random_state=42,
        n_jobs=-1
    )

    # Train
    model.fit(X_train, y_train)

    # Predict
    predictions = model.predict(X_test)

    # Evaluation
    mae = mean_absolute_error(y_test, predictions)
    rmse = mean_squared_error(
        y_test,
        predictions
    ) ** 0.5
    r2 = r2_score(y_test, predictions)

    print("\nModel Evaluation")
    print("----------------")
    print(f"MAE  : {mae:.2f}")
    print(f"RMSE : {rmse:.2f}")
    print(f"R²   : {r2:.2f}")

    # Save model
    os.makedirs(
        os.path.dirname(MODEL_PATH),
        exist_ok=True
    )

    joblib.dump(
        {
            "model": model,
            "features": features
        },
        MODEL_PATH
    )

    print(f"\nModel saved to: {MODEL_PATH}")


if __name__ == "__main__":
    train_model()