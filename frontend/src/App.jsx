import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [backendConnected, setBackendConnected] = useState(false);
  const [apiError, setApiError] = useState("");

  const [showProductForm, setShowProductForm] = useState(false);
  const [activeSection, setActiveSection] = useState("Dashboard");

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category: "",
    price: "",
  });

  const [formMessage, setFormMessage] = useState("");
  const [formError, setFormError] = useState("");

  const fetchEndpoint = async (endpoint) => {
    try {
      const response = await fetch(`${API_URL}${endpoint}`);

      if (!response.ok) {
        throw new Error(
          `${endpoint} returned ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      return {
        success: true,
        data: Array.isArray(data) ? data : [],
      };
    } catch (error) {
      console.error(`API error for ${endpoint}:`, error);

      return {
        success: false,
        data: [],
        error: error.message,
      };
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setApiError("");

    const results = await Promise.all([
      fetchEndpoint("/products/"),
      fetchEndpoint("/warehouses/"),
      fetchEndpoint("/inventory/"),
      fetchEndpoint("/orders/"),
    ]);

    const [
      productsResult,
      warehousesResult,
      inventoryResult,
      ordersResult,
    ] = results;

    let hasConnection = false;
    const errors = [];

    if (productsResult.success) {
      setProducts(productsResult.data);
      hasConnection = true;
    } else {
      errors.push(`Products: ${productsResult.error}`);
    }

    if (warehousesResult.success) {
      setWarehouses(warehousesResult.data);
      hasConnection = true;
    } else {
      errors.push(`Warehouses: ${warehousesResult.error}`);
    }

    if (inventoryResult.success) {
      setInventory(inventoryResult.data);
      hasConnection = true;
    } else {
      errors.push(`Inventory: ${inventoryResult.error}`);
    }

    if (ordersResult.success) {
      setOrders(ordersResult.data);
      hasConnection = true;
    } else {
      errors.push(`Orders: ${ordersResult.error}`);
    }

    setBackendConnected(hasConnection);

    if (!hasConnection) {
      setApiError(
        "Unable to connect to the FastAPI backend. Make sure Uvicorn is running on port 8000."
      );
    } else if (errors.length > 0) {
      setApiError(errors.join(" • "));
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleAddProduct = async (event) => {
    event.preventDefault();

    setFormMessage("");
    setFormError("");

    if (
      !formData.name.trim() ||
      !formData.sku.trim() ||
      !formData.category.trim() ||
      !formData.price
    ) {
      setFormError("Please fill in all product fields.");
      return;
    }

    if (Number(formData.price) < 0) {
      setFormError("Price cannot be negative.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/products/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          sku: formData.sku.trim(),
          category: formData.category.trim(),
          price: Number(formData.price),
        }),
      });

      if (!response.ok) {
        let errorMessage = "Unable to add product.";

        try {
          const errorData = await response.json();

          if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail
              .map((item) => item.msg)
              .join(", ");
          } else if (errorData.detail) {
            errorMessage = errorData.detail;
          }
        } catch {
          // Keep default error message.
        }

        throw new Error(errorMessage);
      }

      setFormMessage("Product added successfully.");

      setFormData({
        name: "",
        sku: "",
        category: "",
        price: "",
      });

      await fetchData();

      setTimeout(() => {
        setShowProductForm(false);
        setFormMessage("");
      }, 700);
    } catch (error) {
      console.error("Add product error:", error);

      setFormError(
        error.message || "Unable to add product. Please try again."
      );
    }
  };

  const closeProductForm = () => {
    setShowProductForm(false);

    setFormData({
      name: "",
      sku: "",
      category: "",
      price: "",
    });

    setFormMessage("");
    setFormError("");
  };

  const totalStock = inventory.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );

  const lowStockItems = inventory.filter(
    (item) => Number(item.quantity || 0) <= 10
  );

  const handleNavigation = (section) => {
    setActiveSection(section);

    const element = document.getElementById(section.toLowerCase());

    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">AI</div>

          <div>
            <h1>Inventory</h1>
            <span>Management System</span>
          </div>
        </div>

        <div className="nav-heading">WORKSPACE</div>

        <nav className="sidebar-nav">
          {[
            "Dashboard",
            "Products",
            "Warehouses",
            "Inventory",
            "Orders",
          ].map((item) => (
            <button
              key={item}
              className={`nav-item ${
                activeSection === item ? "active" : ""
              }`}
              onClick={() => handleNavigation(item)}
            >
              <span className="nav-icon">
                {item === "Dashboard" && "▦"}
                {item === "Products" && "□"}
                {item === "Warehouses" && "⌂"}
                {item === "Inventory" && "≡"}
                {item === "Orders" && "↗"}
              </span>

              <span>{item}</span>
            </button>
          ))}
        </nav>

        <div className="connection-card">
          <div className="connection-row">
            <span
              className={`connection-dot ${
                backendConnected ? "online" : "offline"
              }`}
            />

            <strong>
              {backendConnected
                ? "Backend connected"
                : "Backend unavailable"}
            </strong>
          </div>

          <small>FastAPI · localhost:8000</small>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar" id="dashboard">
          <div>
            <div className="breadcrumb">WORKSPACE / DASHBOARD</div>

            <h2>Inventory Overview</h2>

            <p>
              Keep track of your products, warehouses, orders and stock.
            </p>
          </div>

          <div className="topbar-actions">
            <button className="secondary-button" onClick={fetchData}>
              ↻ Refresh
            </button>

            <button
              className="primary-button"
              onClick={() => setShowProductForm(true)}
            >
              + Add Product
            </button>
          </div>
        </header>

        {apiError && (
          <div className="api-alert">
            <div>
              <strong>API Notice</strong>
              <p>{apiError}</p>
            </div>

            <button onClick={fetchData}>Retry</button>
          </div>
        )}

        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">□</div>

            <div className="stat-content">
              <span>Products</span>
              <strong>{loading ? "—" : products.length}</strong>
              <small>Registered products</small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">⌂</div>

            <div className="stat-content">
              <span>Warehouses</span>
              <strong>{loading ? "—" : warehouses.length}</strong>
              <small>Active locations</small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon orange">≡</div>

            <div className="stat-content">
              <span>Inventory Records</span>
              <strong>{loading ? "—" : inventory.length}</strong>
              <small>Tracked records</small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon purple">#</div>

            <div className="stat-content">
              <span>Total Stock</span>
              <strong>{loading ? "—" : totalStock}</strong>
              <small>Units currently tracked</small>
            </div>
          </div>
        </section>

        <section className="content-card" id="products">
          <div className="section-header">
            <div>
              <span className="section-kicker">CATALOG</span>
              <h3>Products</h3>
              <p>Your current product catalog.</p>
            </div>

            <button
              className="secondary-button"
              onClick={() => setShowProductForm(true)}
            >
              + Add Product
            </button>
          </div>

          {loading ? (
            <div className="empty-state compact">
              <h4>Loading products...</h4>
              <p>Connecting to the inventory database.</p>
            </div>
          ) : products.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">□</div>
              <h4>No products yet</h4>
              <p>Add your first product to get started.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <colgroup>
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "28%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "22%" }} />
                  <col style={{ width: "20%" }} />
                </colgroup>

                <thead>
                  <tr>
                    <th>ID</th>
                    <th>PRODUCT</th>
                    <th>SKU</th>
                    <th>CATEGORY</th>
                    <th>PRICE</th>
                  </tr>
                </thead>

                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <span className="muted-text">
                          #{product.id}
                        </span>
                      </td>

                      <td>
                        <span className="table-primary">
                          {product.name}
                        </span>
                      </td>

                      <td>
                        <span className="sku-text">
                          {product.sku}
                        </span>
                      </td>

                      <td>
                        <span className="category-badge">
                          {product.category}
                        </span>
                      </td>

                      <td>
                        <span className="price-text">
                          ${Number(product.price).toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="content-card" id="warehouses">
          <div className="section-header">
            <div>
              <span className="section-kicker">LOCATIONS</span>
              <h3>Warehouses</h3>
              <p>Storage locations connected to the system.</p>
            </div>
          </div>

          {loading ? (
            <div className="empty-state compact">
              <h4>Loading warehouses...</h4>
              <p>Checking connected storage locations.</p>
            </div>
          ) : warehouses.length === 0 ? (
            <div className="empty-state compact">
              <h4>No warehouses found</h4>
              <p>Warehouse information will appear here.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table warehouse-table">
                <colgroup>
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "45%" }} />
                  <col style={{ width: "40%" }} />
                </colgroup>

                <thead>
                  <tr>
                    <th>ID</th>
                    <th>NAME</th>
                    <th>LOCATION</th>
                  </tr>
                </thead>

                <tbody>
                  {warehouses.map((warehouse) => (
                    <tr key={warehouse.id}>
                      <td>
                        <span className="muted-text">
                          #{warehouse.id}
                        </span>
                      </td>

                      <td>
                        <span className="table-primary">
                          {warehouse.name}
                        </span>
                      </td>

                      <td>
                        <span className="table-secondary">
                          {warehouse.location}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="content-card" id="inventory">
          <div className="section-header inventory-header">
            <div>
              <span className="section-kicker">STOCK</span>
              <h3>Inventory</h3>
              <p>Current stock across your warehouse locations.</p>
            </div>

            <button className="secondary-button" onClick={fetchData}>
              ↻ Refresh
            </button>
          </div>

          {loading ? (
            <div className="empty-state compact">
              <h4>Loading inventory...</h4>
              <p>Reading current stock levels.</p>
            </div>
          ) : inventory.length === 0 ? (
            <div className="empty-state compact">
              <div className="empty-icon">≡</div>
              <h4>No inventory records</h4>
              <p>
                Inventory records will appear here once stock is
                assigned.
              </p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table inventory-table">
                <colgroup>
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "27%" }} />
                  <col style={{ width: "27%" }} />
                  <col style={{ width: "28%" }} />
                </colgroup>

                <thead>
                  <tr>
                    <th>ID</th>
                    <th>PRODUCT ID</th>
                    <th>WAREHOUSE ID</th>
                    <th>QUANTITY</th>
                  </tr>
                </thead>

                <tbody>
                  {inventory.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span className="muted-text">
                          #{item.id}
                        </span>
                      </td>

                      <td>
                        <span className="table-secondary">
                          #{item.product_id}
                        </span>
                      </td>

                      <td>
                        <span className="table-secondary">
                          #{item.warehouse_id}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`quantity-badge ${
                            Number(item.quantity) <= 10
                              ? "low-stock"
                              : ""
                          }`}
                        >
                          {item.quantity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="content-card" id="orders">
          <div className="section-header">
            <div>
              <span className="section-kicker">SALES</span>
              <h3>Orders</h3>
              <p>Recent orders processed through the system.</p>
            </div>
          </div>

          {loading ? (
            <div className="empty-state compact">
              <h4>Loading orders...</h4>
              <p>Checking recent order activity.</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="empty-state compact">
              <div className="empty-icon">↗</div>
              <h4>No orders yet</h4>
              <p>Completed orders will appear here.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table orders-table">
                <colgroup>
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "30%" }} />
                </colgroup>

                <thead>
                  <tr>
                    <th>ORDER</th>
                    <th>PRODUCT ID</th>
                    <th>WAREHOUSE ID</th>
                    <th>QUANTITY</th>
                    <th>STATUS</th>
                  </tr>
                </thead>

                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <span className="muted-text">
                          #{order.id}
                        </span>
                      </td>

                      <td>
                        <span className="table-secondary">
                          #{order.product_id}
                        </span>
                      </td>

                      <td>
                        <span className="table-secondary">
                          #{order.warehouse_id}
                        </span>
                      </td>

                      <td>
                        <span className="quantity-badge">
                          {order.quantity}
                        </span>
                      </td>

                      <td>
                        <span className="category-badge">
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="content-card">
          <div className="section-header">
            <div>
              <span className="section-kicker">ATTENTION</span>
              <h3>Stock Alerts</h3>
              <p>Items that may need attention soon.</p>
            </div>
          </div>

          {lowStockItems.length === 0 ? (
            <div className="empty-state compact">
              <h4>Everything looks good</h4>
              <p>No inventory records are currently below the low-stock threshold.</p>
            </div>
          ) : (
            <div className="alert-list">
              {lowStockItems.map((item) => (
                <div className="stock-alert" key={item.id}>
                  <div>
                    <strong>
                      Product #{item.product_id}
                    </strong>
                    <span>
                      Warehouse #{item.warehouse_id}
                    </span>
                  </div>

                  <span className="low-stock-value">
                    {item.quantity} units
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <footer className="page-footer">
          <span>AI Inventory Management</span>
          <span>Inventory optimization dashboard</span>
        </footer>
      </main>

      {showProductForm && (
        <div className="modal-overlay" onClick={closeProductForm}>
          <div
            className="modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="section-kicker">
                  PRODUCT CATALOG
                </span>

                <h3>Add Product</h3>

                <p>
                  Enter the basic details for a new product.
                </p>
              </div>

              <button
                className="modal-close"
                onClick={closeProductForm}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddProduct}>
              <div className="form-grid">
                <div className="form-group full">
                  <label htmlFor="name">Product Name</label>

                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. Wireless Mouse"
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="sku">SKU</label>

                  <input
                    id="sku"
                    name="sku"
                    type="text"
                    value={formData.sku}
                    onChange={handleInputChange}
                    placeholder="e.g. MOU001"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="category">Category</label>

                  <input
                    id="category"
                    name="category"
                    type="text"
                    value={formData.category}
                    onChange={handleInputChange}
                    placeholder="e.g. Electronics"
                  />
                </div>

                <div className="form-group full">
                  <label htmlFor="price">Price</label>

                  <input
                    id="price"
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="e.g. 25.99"
                  />
                </div>
              </div>

              {formError && (
                <div className="form-message error">
                  {formError}
                </div>
              )}

              {formMessage && (
                <div className="form-message success">
                  {formMessage}
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeProductForm}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;