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
   * ------------------------------------------------------------
   * INVENTORY AVAILABILITY
   * ------------------------------------------------------------
   *
   * An inventory record means that this product/warehouse
   * combination exists in the inventory table.
   *
   * We intentionally check for the record itself instead of
   * quantity > 0 because a warehouse with 0 stock is still a
   * valid inventory location for AI analysis.
   */

  const inventoryPairs = useMemo(() => {
    return inventory.map((item) => ({
      productId: Number(item.product_id),
      warehouseId: Number(item.warehouse_id),
    }));
  }, [inventory]);

  /*
   * ------------------------------------------------------------
   * AVAILABLE WAREHOUSES FOR SELECTED PRODUCT
   * ------------------------------------------------------------
   */

  const availableWarehouses = useMemo(() => {
    if (!productId) {
      return warehouses;
    }

    const selectedProductId = Number(productId);

    const warehouseIds = new Set(
      inventoryPairs
        .filter(
          (item) => item.productId === selectedProductId
        )
        .map((item) => item.warehouseId)
    );

    return warehouses.filter((warehouse) =>
      warehouseIds.has(Number(warehouse.id))
    );
  }, [
    warehouses,
    productId,
    inventoryPairs,
  ]);

  /*
   * ------------------------------------------------------------
   * AVAILABLE PRODUCTS FOR SELECTED WAREHOUSE
   * ------------------------------------------------------------
   */

  const availableProducts = useMemo(() => {
    if (!warehouseId) {
      return products;
    }

    const selectedWarehouseId = Number(warehouseId);

    const productIds = new Set(
      inventoryPairs
        .filter(
          (item) =>
            item.warehouseId === selectedWarehouseId
        )
        .map((item) => item.productId)
    );

    return products.filter((product) =>
      productIds.has(Number(product.id))
    );
  }, [
    products,
    warehouseId,
    inventoryPairs,
  ]);

  /*
   * ------------------------------------------------------------
   * DEFAULT PRODUCT
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (products.length === 0) {
      setProductId("");
      return;
    }

    const currentProductExists = products.some(
      (product) =>
        Number(product.id) === Number(productId)
    );

    if (!productId || !currentProductExists) {
      setProductId(String(products[0].id));
    }
  }, [products, productId]);

  /*
   * ------------------------------------------------------------
   * DEFAULT / VALID WAREHOUSE FOR SELECTED PRODUCT
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (availableWarehouses.length === 0) {
      setWarehouseId("");
      return;
    }

    const currentWarehouseExists =
      availableWarehouses.some(
        (warehouse) =>
          Number(warehouse.id) === Number(warehouseId)
      );

    if (!warehouseId || !currentWarehouseExists) {
      setWarehouseId(
        String(availableWarehouses[0].id)
      );
    }
  }, [
    availableWarehouses,
    warehouseId,
  ]);

  /*
   * ------------------------------------------------------------
   * KEEP PRODUCT VALID WHEN WAREHOUSE CHANGES
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (availableProducts.length === 0) {
      setProductId("");
      return;
    }

    const currentProductExists =
      availableProducts.some(
        (product) =>
          Number(product.id) === Number(productId)
      );

    if (!productId || !currentProductExists) {
      setProductId(
        String(availableProducts[0].id)
      );
    }
  }, [
    availableProducts,
    productId,
  ]);

  /*
   * ------------------------------------------------------------
   * RESET RESULT WHEN SELECTION CHANGES
   * ------------------------------------------------------------
   */

  useEffect(() => {
    setOptimization(null);
    setError("");
  }, [productId, warehouseId]);

  /*
   * ------------------------------------------------------------
   * ANALYZE INVENTORY
   * ------------------------------------------------------------
   */

  const analyzeInventory = async () => {
    if (!productId || !warehouseId) {
      setError(
        "Select a product and warehouse with available inventory."
      );
      return;
    }

    const validCombination = inventoryPairs.some(
      (item) =>
        item.productId === Number(productId) &&
        item.warehouseId === Number(warehouseId)
    );

    if (!validCombination) {
      setError(
        "This product is not available in the selected warehouse."
      );
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
          err.message ||
            "Failed to analyze inventory"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /*
   * ------------------------------------------------------------
   * SELECTED PRODUCT / WAREHOUSE
   * ------------------------------------------------------------
   */

  const selectedProduct = products.find(
    (product) =>
      Number(product.id) === Number(productId)
  );

  const selectedWarehouse = warehouses.find(
    (warehouse) =>
      Number(warehouse.id) === Number(warehouseId)
  );

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <span className="section-kicker">
            AI / ML
          </span>

          <h2>Inventory Optimization</h2>

          <p>
            Analyze demand and get AI-powered
            reorder recommendations.
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
            onChange={(e) =>
              setProductId(e.target.value)
            }
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
                  No products in selected warehouse
                </option>
              )}

            {availableProducts.map((product) => (
              <option
                key={product.id}
                value={product.id}
              >
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
            onChange={(e) =>
              setWarehouseId(e.target.value)
            }
            disabled={availableWarehouses.length === 0}
          >
            {availableWarehouses.length === 0 && (
              <option value="">
                No warehouse has this product
              </option>
            )}

            {availableWarehouses.map((warehouse) => (
              <option
                key={warehouse.id}
                value={warehouse.id}
              >
                {warehouse.name} —{" "}
                {warehouse.location}
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
            !warehouseId
          }
        >
          {loading
            ? "Analyzing..."
            : "Analyze Inventory"}
        </button>
      </section>

      {/* SELECTION INFORMATION */}

      {selectedProduct &&
        selectedWarehouse &&
        productId &&
        warehouseId && (
          <div
            style={{
              marginTop: "12px",
              padding: "10px 14px",
              borderRadius: "8px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              fontSize: "13px",
              color: "#64748b",
            }}
          >
            Analyzing{" "}
            <strong style={{ color: "#1f2937" }}>
              {selectedProduct.name}
            </strong>{" "}
            from{" "}
            <strong style={{ color: "#1f2937" }}>
              {selectedWarehouse.name}
            </strong>
            .
          </div>
        )}

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
              {
                optimization.recommended_order_quantity
              }
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
              Select a product and warehouse, then
              click "Analyze Inventory".
            </p>
          </div>
        )}
    </div>
  );
}

export default Dashboard;