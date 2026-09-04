import { useEffect, useMemo, useState } from "react";
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
   * Only inventory records with stock > 0 are considered
   * available for AI optimization.
   */
  const availableInventory = useMemo(() => {
    return inventory.filter(
      (item) => Number(item.quantity || 0) > 0
    );
  }, [inventory]);

  /*
   * Warehouses available for the currently selected product.
   */
  const availableWarehouses = useMemo(() => {
    if (!productId) {
      return warehouses;
    }

    const warehouseIds = new Set(
      availableInventory
        .filter(
          (item) =>
            Number(item.product_id) === Number(productId)
        )
        .map((item) => Number(item.warehouse_id))
    );

    return warehouses.filter((warehouse) =>
      warehouseIds.has(Number(warehouse.id))
    );
  }, [
    productId,
    warehouses,
    availableInventory,
  ]);

  /*
   * Products available in the currently selected warehouse.
   */
  const availableProducts = useMemo(() => {
    if (!warehouseId) {
      return products;
    }

    const productIds = new Set(
      availableInventory
        .filter(
          (item) =>
            Number(item.warehouse_id) === Number(warehouseId)
        )
        .map((item) => Number(item.product_id))
    );

    return products.filter((product) =>
      productIds.has(Number(product.id))
    );
  }, [
    warehouseId,
    products,
    availableInventory,
  ]);

  /*
   * Set a valid initial product.
   */
  useEffect(() => {
    if (availableProducts.length === 0) {
      setProductId("");
      return;
    }

    const currentProductExists = availableProducts.some(
      (product) =>
        Number(product.id) === Number(productId)
    );

    if (!currentProductExists) {
      setProductId(String(availableProducts[0].id));
    }
  }, [availableProducts, productId]);

  /*
   * Set a valid warehouse for the selected product.
   */
  useEffect(() => {
    if (availableWarehouses.length === 0) {
      setWarehouseId("");
      return;
    }

    const currentWarehouseExists = availableWarehouses.some(
      (warehouse) =>
        Number(warehouse.id) === Number(warehouseId)
    );

    if (!currentWarehouseExists) {
      setWarehouseId(String(availableWarehouses[0].id));
    }
  }, [availableWarehouses, warehouseId]);

  /*
   * When the user changes the product, clear old optimization
   * results because they belong to the previous selection.
   */
  const handleProductChange = (event) => {
    const newProductId = event.target.value;

    setProductId(newProductId);
    setOptimization(null);
    setError("");

    const matchingWarehouses = warehouses.filter((warehouse) =>
      availableInventory.some(
        (item) =>
          Number(item.product_id) === Number(newProductId) &&
          Number(item.warehouse_id) === Number(warehouse.id) &&
          Number(item.quantity || 0) > 0
      )
    );

    if (matchingWarehouses.length > 0) {
      const currentWarehouseStillValid =
        matchingWarehouses.some(
          (warehouse) =>
            Number(warehouse.id) === Number(warehouseId)
        );

      if (!currentWarehouseStillValid) {
        setWarehouseId(String(matchingWarehouses[0].id));
      }
    } else {
      setWarehouseId("");
    }
  };

  /*
   * When the user changes the warehouse, only products
   * available in that warehouse remain selectable.
   */
  const handleWarehouseChange = (event) => {
    const newWarehouseId = event.target.value;

    setWarehouseId(newWarehouseId);
    setOptimization(null);
    setError("");

    const matchingProducts = products.filter((product) =>
      availableInventory.some(
        (item) =>
          Number(item.warehouse_id) === Number(newWarehouseId) &&
          Number(item.product_id) === Number(product.id) &&
          Number(item.quantity || 0) > 0
      )
    );

    if (matchingProducts.length > 0) {
      const currentProductStillValid =
        matchingProducts.some(
          (product) =>
            Number(product.id) === Number(productId)
        );

      if (!currentProductStillValid) {
        setProductId(String(matchingProducts[0].id));
      }
    } else {
      setProductId("");
    }
  };

  const analyzeInventory = async () => {
    if (!productId || !warehouseId) {
      setError("Select a product and warehouse first.");
      return;
    }

    /*
     * Extra frontend validation so an invalid combination
     * cannot reach the optimization API.
     */
    const matchingInventory = inventory.find(
      (item) =>
        Number(item.product_id) === Number(productId) &&
        Number(item.warehouse_id) === Number(warehouseId) &&
        Number(item.quantity || 0) > 0
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
            {products.length === 0 && (
              <option value="">
                No products available
              </option>
            )}

            {availableProducts.length === 0 &&
              products.length > 0 && (
                <option value="">
                  No products available in this warehouse
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
            {warehouses.length === 0 && (
              <option value="">
                No warehouses available
              </option>
            )}

            {availableWarehouses.length === 0 &&
              warehouses.length > 0 && (
                <option value="">
                  No warehouse has this product in stock
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