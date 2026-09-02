import { useEffect, useMemo, useState } from "react";
import "./MockChannelApp.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

const CHANNELS = {
  amazon: {
    name: "Amazon",
    badge: "A",
    prefix: "AMZ",
    tagline: "Everything you need, delivered.",
  },
  flipkart: {
    name: "Flipkart",
    badge: "F",
    prefix: "FLP",
    tagline: "India's marketplace for everyday shopping.",
  },
  shopify: {
    name: "Shopify Store",
    badge: "S",
    prefix: "SHP",
    tagline: "A direct-to-customer storefront.",
  },
};

function getChannelFromPath() {
  const match = window.location.pathname.match(/^\/mock\/(amazon|flipkart|shopify)\/?$/i);
  return match ? match[1].toLowerCase() : "amazon";
}

function generateOrderId(channel) {
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${CHANNELS[channel].prefix}-${randomPart}`;
}

function MockChannelApp() {
  const [channel, setChannel] = useState(getChannelFromPath());
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [placing, setPlacing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [lastOrder, setLastOrder] = useState(null);

  const meta = CHANNELS[channel];

  const loadCatalog = async () => {
    setLoading(true);
    setApiError("");

    try {
      const [productsResponse, inventoryResponse] = await Promise.all([
        fetch(`${API_URL}/products/`),
        fetch(`${API_URL}/inventory/`),
      ]);

      if (!productsResponse.ok) {
        throw new Error("Unable to load the product catalog.");
      }

      if (!inventoryResponse.ok) {
        throw new Error("Unable to load product availability.");
      }

      const productsData = await productsResponse.json();
      const inventoryData = await inventoryResponse.json();

      setProducts(Array.isArray(productsData) ? productsData : []);
      setInventory(Array.isArray(inventoryData) ? inventoryData : []);
    } catch (err) {
      console.error("Mock marketplace load error:", err);
      setApiError(
        err.message || "Unable to connect to the inventory service."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  const availableProducts = useMemo(() => {
    return products
      .map((product) => {
        const rows = inventory.filter(
          (item) => Number(item.product_id) === Number(product.id)
        );

        const totalAvailable = rows.reduce(
          (sum, item) => sum + Number(item.quantity || 0),
          0
        );

        return {
          ...product,
          totalAvailable,
          inventoryRows: rows,
        };
      })
      .filter((product) => product.totalAvailable > 0);
  }, [products, inventory]);

  const selectedProduct = availableProducts.find(
    (product) => Number(product.id) === Number(selectedProductId)
  );

  const selectedQuantity = Math.max(1, Number(quantity) || 1);

  const findFulfillmentWarehouse = () => {
    if (!selectedProduct) return null;

    // The customer does not choose an internal warehouse. The mock channel
    // selects a warehouse that can fulfill the complete order.
    return selectedProduct.inventoryRows.find(
      (item) => Number(item.quantity) >= selectedQuantity
    );
  };

  const getApiErrorMessage = async (response, fallback) => {
    try {
      const data = await response.json();
      if (Array.isArray(data.detail)) {
        return data.detail.map((item) => item.msg).join(", ");
      }
      if (data.detail) return data.detail;
    } catch {
      // Keep fallback.
    }
    return fallback;
  };

  const switchChannel = (nextChannel) => {
    setChannel(nextChannel);
    setSelectedProductId("");
    setQuantity(1);
    setMessage("");
    setError("");
    setLastOrder(null);
    window.history.pushState({}, "", `/mock/${nextChannel}`);
  };

  const placeOrder = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!selectedProduct) {
      setError("Please select a product.");
      return;
    }

    if (!Number.isInteger(selectedQuantity) || selectedQuantity <= 0) {
      setError("Quantity must be a whole number greater than 0.");
      return;
    }

    const fulfillment = findFulfillmentWarehouse();

    if (!fulfillment) {
      setError(
        "This quantity is not available from a single fulfillment warehouse."
      );
      return;
    }

    const orderId = generateOrderId(channel);

    const payload = {
      channel,
      order_id: orderId,
      product_id: Number(selectedProduct.id),
      warehouse_id: Number(fulfillment.warehouse_id),
      quantity: selectedQuantity,
      status: "PLACED",
    };

    setPlacing(true);

    try {
      const response = await fetch(`${API_URL}/webhooks/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(response, "Order could not be placed.")
        );
      }

      const result = await response.json();

      setLastOrder({
        orderId,
        productName: selectedProduct.name,
        quantity: selectedQuantity,
        remainingStock: result.remaining_stock,
        status: result.status,
      });

      setMessage(
        `Order ${orderId} placed successfully. The inventory synchronization service processed it.`
      );

      setSelectedProductId("");
      setQuantity(1);

      // Reload availability so the marketplace immediately reflects the
      // central stock after synchronization.
      await loadCatalog();
    } catch (err) {
      console.error("Mock marketplace order error:", err);
      setError(err.message || "Order could not be placed.");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="mock-shell">
      <header className="mock-header">
        <div className="mock-brand">
          <div className={`mock-logo ${channel}`}>{meta.badge}</div>
          <div>
            <strong>{meta.name}</strong>
            <span>Mock Sales Channel</span>
          </div>
        </div>

        <div className="channel-switcher">
          {Object.entries(CHANNELS).map(([key, value]) => (
            <button
              key={key}
              type="button"
              className={channel === key ? "active" : ""}
              onClick={() => switchChannel(key)}
            >
              {value.name}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="admin-link"
          onClick={() => {
            window.location.href = "/";
          }}
        >
          Admin Dashboard
        </button>
      </header>

      <main className="mock-main">
        <section className="mock-hero">
          <div>
            <span className="mock-eyebrow">EXTERNAL CUSTOMER EXPERIENCE</span>
            <h1>{meta.name}</h1>
            <p>{meta.tagline}</p>
            <div className="integration-pill">
              <span className="pulse-dot" />
              Connected to live inventory availability
            </div>
          </div>

          <div className="mock-flow-card">
            <span>ORDER FLOW</span>
            <strong>Customer → Webhook → Sync → Inventory</strong>
            <small>
              This page behaves like an external sales channel. It never
              changes inventory directly.
            </small>
          </div>
        </section>

        {apiError && (
          <div className="mock-alert error">
            <strong>Connection problem</strong>
            <p>{apiError}</p>
            <button type="button" onClick={loadCatalog}>
              Retry
            </button>
          </div>
        )}

        <section className="mock-content">
          <div className="catalog-heading">
            <div>
              <span className="mock-eyebrow">CATALOG</span>
              <h2>Featured products</h2>
            </div>
            <span className="catalog-count">
              {loading ? "Loading..." : `${availableProducts.length} available`}
            </span>
          </div>

          {loading ? (
            <div className="mock-empty">
              <strong>Loading products...</strong>
              <span>Reading current availability from the inventory API.</span>
            </div>
          ) : availableProducts.length === 0 ? (
            <div className="mock-empty">
              <strong>No products currently available</strong>
              <span>
                Add products and stock from the Admin Dashboard first.
              </span>
            </div>
          ) : (
            <div className="product-grid">
              {availableProducts.map((product) => (
                <article
                  className={`product-card ${
                    Number(selectedProductId) === Number(product.id)
                      ? "selected"
                      : ""
                  }`}
                  key={product.id}
                >
                  <div className="product-image">
                    <span>{product.name?.slice(0, 1).toUpperCase() || "P"}</span>
                  </div>

                  <div className="product-card-body">
                    <span className="product-category">
                      {product.category || "Product"}
                    </span>
                    <h3>{product.name}</h3>
                    <p className="product-sku">{product.sku}</p>
                    <div className="product-bottom">
                      <strong>
                        ${Number(product.price || 0).toFixed(2)}
                      </strong>
                      <span>{product.totalAvailable} in stock</span>
                    </div>

                    <button
                      type="button"
                      className="buy-select-button"
                      onClick={() => {
                        setSelectedProductId(String(product.id));
                        setQuantity(1);
                        setMessage("");
                        setError("");
                      }}
                    >
                      {Number(selectedProductId) === Number(product.id)
                        ? "Selected"
                        : "Buy this product"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="checkout-card">
          <div>
            <span className="mock-eyebrow">CHECKOUT</span>
            <h2>Place a test customer order</h2>
            <p>
              Select a product and quantity. The fulfillment warehouse is
              chosen automatically for the simulated marketplace.
            </p>
          </div>

          <form onSubmit={placeOrder} className="checkout-form">
            <label>
              Product
              <select
                value={selectedProductId}
                onChange={(event) => {
                  setSelectedProductId(event.target.value);
                  setMessage("");
                  setError("");
                }}
                disabled={placing || loading}
              >
                <option value="">Choose a product</option>
                {availableProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} — ${Number(product.price || 0).toFixed(2)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Quantity
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(event) => {
                  setQuantity(event.target.value);
                  setMessage("");
                  setError("");
                }}
                disabled={placing || !selectedProduct}
              />
            </label>

            <div className="checkout-summary">
              <span>Order source</span>
              <strong>{meta.name} Mock</strong>
              <span>Fulfillment</span>
              <strong>
                {selectedProduct
                  ? findFulfillmentWarehouse()
                    ? "Automatically selected"
                    : "Quantity unavailable"
                  : "Select a product"}
              </strong>
            </div>

            <button
              type="submit"
              className="place-order-button"
              disabled={
                placing ||
                loading ||
                !selectedProduct ||
                !findFulfillmentWarehouse()
              }
            >
              {placing ? "Sending order..." : `Place ${meta.name} Order`}
            </button>
          </form>

          {error && (
            <div className="mock-alert error">
              <strong>Order not placed</strong>
              <p>{error}</p>
            </div>
          )}

          {message && (
            <div className="mock-alert success">
              <strong>Order accepted</strong>
              <p>{message}</p>
            </div>
          )}
        </section>

        {lastOrder && (
          <section className="success-card">
            <div className="success-check">✓</div>
            <div>
              <span className="mock-eyebrow">WEBHOOK PROCESSED</span>
              <h2>{lastOrder.orderId}</h2>
              <p>
                {lastOrder.productName} × {lastOrder.quantity}
              </p>
            </div>
            <div className="remaining-stock">
              <span>Central stock after sync</span>
              <strong>{lastOrder.remainingStock ?? "Updated"}</strong>
            </div>
          </section>
        )}

        <footer className="mock-footer">
          <strong>Simulation only</strong>
          <span>
            This marketplace is intentionally separate from the Admin
            Inventory Management System.
          </span>
        </footer>
      </main>
    </div>
  );
}

export default MockChannelApp;
