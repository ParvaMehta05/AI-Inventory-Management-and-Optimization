import { useMemo, useState } from "react";
import "../App.css";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://ai-inventory-management-and-optimization.onrender.com"
).replace(/\/$/, "");

function Dashboard({
  products = [],
  warehouses = [],
  inventory = [],
}) {
  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");

  const [optimization, setOptimization] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /*
   * All inventory records are valid for selection.
   * Quantity can be 0 and the record is still considered valid.
   */
  const availableWarehouses = useMemo(() => {
    if (!productId) {
      return warehouses;
    }

    const warehouseIds = new Set(
      inventory
        .filter(
          (item) =>
            Number(item.product_id) === Number(productId)
        )
        .map((item) => Number(item.warehouse_id))
    );

    return warehouses.filter((warehouse) =>
      warehouseIds.has(Number(warehouse.id))
    );
  }, [productId, warehouses, inventory]);

  /*
   * Products available in the selected warehouse.
   */
  const availableProducts = useMemo(() => {
    if (!warehouseId) {
      return products;
    }

    const productIds = new Set(
      inventory
        .filter(
          (item) =>
            Number(item.warehouse_id) === Number(warehouseId)
        )
        .map((item) => Number(item.product_id))
    );

    return products.filter((product) =>
      productIds.has(Number(product.id))
    );
  }, [warehouseId, products, inventory]);

  /*
   * Product selection.
   *
   * Do NOT automatically select another product or warehouse.
   * If the current warehouse is not valid for the new product,
   * simply clear the warehouse selection.
   */
  const handleProductChange = (event) => {
    const newProductId = event.target.value;

    setProductId(newProductId);
    setOptimization(null);
    setError("");

    if (!newProductId) {
      setWarehouseId("");
      return;
    }

    const currentWarehouseIsValid = inventory.some(
      (item) =>
        Number(item.product_id) === Number(newProductId) &&
        Number(item.warehouse_id) === Number(warehouseId)
    );

    if (warehouseId && !currentWarehouseIsValid) {
      setWarehouseId("");
    }
  };

  /*
   * Warehouse selection.
   *
   * Do NOT automatically select another warehouse or product.
   * If the current product is not valid for the new warehouse,
   * simply clear the product selection.
   */
  const handleWarehouseChange = (event) => {
    const newWarehouseId = event.target.value;

    setWarehouseId(newWarehouseId);
    setOptimization(null);
    setError("");

    if (!newWarehouseId) {
      setProductId("");
      return;
    }

    const currentProductIsValid = inventory.some(
      (item) =>
        Number(item.warehouse_id) === Number(newWarehouseId) &&
        Number(item.product_id) === Number(productId)
    );

    if (productId && !currentProductIsValid) {
      setProductId("");
    }
  };

  /*
   * Analyze selected product + warehouse.
   */
  const analyzeInventory = async () => {
    if (!productId || !warehouseId) {
      setError("Select a product and warehouse first.");
      return;
    }

    /*
     * Validate that an inventory record exists.
     * Quantity can be 0; the record is still valid.
     */
    const matchingInventory = inventory.find(
      (item) =>
        Number(item.product_id) === Number(productId) &&
        Number(item.warehouse_id) === Number(warehouseId)
    );

    if (!matchingInventory) {
      setError(
        "This product is not available in the selected warehouse."
      );
      setOptimization(null);
      return;
    }

    setLoading(true);
    setError("");
    setOptimization(null);

    try {
      const response = await fetch(
        `${API_URL}/optimization/${productId}/${warehouseId}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to analyze inventory"
        );
      }

      setOptimization(data);

      /*
       * IMPORTANT:
       * After successful analysis, clear both selections.
       * This also ensures refresh/new analysis starts clean.
       */
      setProductId("");
      setWarehouseId("");
    } catch (err) {
      console.error(
        "Inventory optimization error:",
        err
      );

      if (err instanceof TypeError) {
        setError(
          "Unable to connect to the optimization service. Please try again."
        );
      } else {
        setError(
          err.message || "Failed to analyze inventory"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <span className="section-kicker">
            AI / ML
          </span>

          <h2>Inventory Optimization</h2>

          <p>
            Analyze demand and get AI-powered reorder
            recommendations.
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
            onChange={handleProductChange}
            disabled={products.length === 0}
          >
            <option value="">
              Select a product
            </option>

            {products.length === 0 && (
              <option value="">
                No products available
              </option>
            )}

            {availableProducts.map((product) => (
              <option
                key={product.id}
                value={product.id}
              >
                {product.name}
                {product.sku
                  ? ` — ${product.sku}`
                  : ""}
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
            onChange={handleWarehouseChange}
            disabled={warehouses.length === 0}
          >
            <option value="">
              Select a warehouse
            </option>

            {warehouses.length === 0 && (
              <option value="">
                No warehouses available
              </option>
            )}

            {availableWarehouses.map((warehouse) => (
              <option
                key={warehouse.id}
                value={warehouse.id}
              >
                {warehouse.name}
                {warehouse.location
                  ? ` — ${warehouse.location}`
                  : ""}
              </option>
            ))}
          </select>
        </div>

        <button
          className="primary-button"
          onClick={analyzeInventory}
          disabled={
            loading ||
            !productId ||
            !warehouseId ||
            availableProducts.length === 0 ||
            availableWarehouses.length === 0
          }
        >
          {loading
            ? "Analyzing..."
            : "Analyze Inventory"}
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

          <div className="metric-card status-card">
            <h3>Inventory Status</h3>

            <p>
              {optimization.status}
            </p>

            <span>
              Lead time:{" "}
              {optimization.lead_time_days} days
            </span>
          </div>

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
      {!optimization &&
        !loading &&
        !error && (
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