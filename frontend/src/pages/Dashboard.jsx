import { useEffect, useState } from "react";
import "../App.css";

function Dashboard({ products = [], warehouses = [] }) {
  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");

  const [optimization, setOptimization] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Once the catalog loads, default to the first product/warehouse
  // instead of asking the user to type an ID.
  useEffect(() => {
    if (!productId && products.length > 0) {
      setProductId(String(products[0].id));
    }
  }, [products, productId]);

  useEffect(() => {
    if (!warehouseId && warehouses.length > 0) {
      setWarehouseId(String(warehouses[0].id));
    }
  }, [warehouses, warehouseId]);

  const analyzeInventory = async () => {
    if (!productId || !warehouseId) {
      setError("Select a product and warehouse first.");
      return;
    }

    setLoading(true);
    setError("");
    setOptimization(null);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/optimization/${productId}/${warehouseId}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to analyze inventory");
      }

      setOptimization(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">

      <header className="dashboard-header">
        <div>
          <span className="section-kicker">AI / ML</span>

          <h2>Inventory Optimization</h2>

          <p>
            Analyze demand and get AI-powered reorder recommendations.
          </p>
        </div>
      </header>

      {/* PRODUCT / WAREHOUSE SELECTION */}
      <section className="selection-panel">

        <div className="input-group">
          <label htmlFor="product-id">
            Product
          </label>

          <select
            id="product-id"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            disabled={products.length === 0}
          >
            {products.length === 0 && (
              <option value="">No products available</option>
            )}

            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} — {product.sku}
              </option>
            ))}
          </select>
        </div>

        <div className="input-group">
          <label htmlFor="warehouse-id">
            Warehouse
          </label>

          <select
            id="warehouse-id"
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            disabled={warehouses.length === 0}
          >
            {warehouses.length === 0 && (
              <option value="">No warehouses available</option>
            )}

            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name} — {warehouse.location}
              </option>
            ))}
          </select>
        </div>

        <button
          className="primary-button"
          onClick={analyzeInventory}
          disabled={loading || !productId || !warehouseId}
        >
          {loading ? "Analyzing..." : "Analyze Inventory"}
        </button>

      </section>

      {/* ERROR */}
      {error && (
        <div className="form-message error">
          {error}
        </div>
      )}

      {/* RESULTS */}
      {optimization && (
        <section className="metrics-grid">

          <div className="metric-card">
            <h3>Current Stock</h3>

            <p>
              {optimization.current_stock}
            </p>

            <span>units</span>
          </div>

          <div className="metric-card">
            <h3>Predicted Demand</h3>

            <p>
              {Number(
                optimization.predicted_daily_demand
              ).toFixed(2)}
            </p>

            <span>units / day</span>
          </div>

          <div className="metric-card">
            <h3>Demand Std.</h3>

            <p>
              {Number(
                optimization.demand_std
              ).toFixed(2)}
            </p>

            <span>units</span>
          </div>

          <div className="metric-card">
            <h3>Safety Stock</h3>

            <p>
              {Number(
                optimization.safety_stock
              ).toFixed(2)}
            </p>

            <span>units</span>
          </div>

          <div className="metric-card">
            <h3>Reorder Point</h3>

            <p>
              {Number(
                optimization.reorder_point
              ).toFixed(2)}
            </p>

            <span>units</span>
          </div>

          <div className="metric-card">
            <h3>Recommended Order</h3>

            <p>
              {optimization.recommended_order_quantity}
            </p>

            <span>units</span>
          </div>

          {/* STATUS */}
          <div className="metric-card status-card">
            <h3>Inventory Status</h3>

            <p>
              {optimization.status}
            </p>

            <span>
              Lead time: {optimization.lead_time_days} days
            </span>
          </div>

          {/* LEAD TIME DEMAND */}
          <div className="metric-card">
            <h3>Lead Time Demand</h3>

            <p>
              {Number(
                optimization.lead_time_demand
              ).toFixed(2)}
            </p>

            <span>units</span>
          </div>

        </section>
      )}

      {/* INITIAL STATE */}
      {!optimization && !loading && !error && (
        <div className="empty-state compact">
          <h4>Ready to analyze</h4>

          <p>
            Select a product and warehouse, then click
            "Analyze Inventory".
          </p>
        </div>
      )}

    </div>
  );
}

export default Dashboard;