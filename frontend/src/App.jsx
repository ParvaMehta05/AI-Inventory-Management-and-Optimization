import { useEffect, useState } from "react";
import "./App.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

function App() {
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [backendConnected, setBackendConnected] = useState(false);
  const [apiError, setApiError] = useState("");

  const [showProductForm, setShowProductForm] = useState(false);
  const [showWarehouseForm, setShowWarehouseForm] = useState(false);
  const [showInventoryForm, setShowInventoryForm] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);

  const [activeSection, setActiveSection] = useState("Dashboard");

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category: "",
    price: "",
  });

  const [warehouseFormData, setWarehouseFormData] = useState({
    name: "",
    location: "",
  });

  const [inventoryFormData, setInventoryFormData] = useState({
    product_id: "",
    warehouse_id: "",
    quantity: "",
  });

  const [orderFormData, setOrderFormData] = useState({
    product_id: "",
    warehouse_id: "",
    quantity: "",
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
        "Unable to connect to the FastAPI backend. Please check the backend URL and CORS configuration."
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

  const handleWarehouseInputChange = (event) => {
    const { name, value } = event.target;

    setWarehouseFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleInventoryInputChange = (event) => {
    const { name, value } = event.target;

    setInventoryFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleOrderInputChange = (event) => {
    const { name, value } = event.target;

    setOrderFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const getApiErrorMessage = async (response, defaultMessage) => {
    let errorMessage = defaultMessage;

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

    return errorMessage;
  };

  // ---------------- PRODUCT ----------------

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
        throw new Error(
          await getApiErrorMessage(response, "Unable to add product.")
        );
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

  // ---------------- WAREHOUSE ----------------

  const handleAddWarehouse = async (event) => {
    event.preventDefault();

    setFormMessage("");
    setFormError("");

    if (
      !warehouseFormData.name.trim() ||
      !warehouseFormData.location.trim()
    ) {
      setFormError("Please enter the warehouse name and location.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/warehouses/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: warehouseFormData.name.trim(),
          location: warehouseFormData.location.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(response, "Unable to add warehouse.")
        );
      }

      setFormMessage("Warehouse added successfully.");

      setWarehouseFormData({
        name: "",
        location: "",
      });

      await fetchData();

      setTimeout(() => {
        setShowWarehouseForm(false);
        setFormMessage("");
      }, 700);
    } catch (error) {
      console.error("Add warehouse error:", error);

      setFormError(
        error.message || "Unable to add warehouse. Please try again."
      );
    }
  };

  // ---------------- INVENTORY ----------------

  const handleAddInventory = async (event) => {
    event.preventDefault();

    setFormMessage("");
    setFormError("");

    if (
      !inventoryFormData.product_id ||
      !inventoryFormData.warehouse_id ||
      inventoryFormData.quantity === ""
    ) {
      setFormError(
        "Please select a product, warehouse and enter a quantity."
      );
      return;
    }

    if (Number(inventoryFormData.quantity) < 0) {
      setFormError("Quantity cannot be negative.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/inventory/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_id: Number(inventoryFormData.product_id),
          warehouse_id: Number(inventoryFormData.warehouse_id),
          quantity: Number(inventoryFormData.quantity),
        }),
      });

      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(response, "Unable to add inventory.")
        );
      }

      setFormMessage("Inventory added successfully.");

      setInventoryFormData({
        product_id: "",
        warehouse_id: "",
        quantity: "",
      });

      await fetchData();

      setTimeout(() => {
        setShowInventoryForm(false);
        setFormMessage("");
      }, 700);
    } catch (error) {
      console.error("Add inventory error:", error);

      setFormError(
        error.message || "Unable to add inventory. Please try again."
      );
    }
  };

  // ---------------- ORDER ----------------

  const handleAddOrder = async (event) => {
    event.preventDefault();

    setFormMessage("");
    setFormError("");

    if (
      !orderFormData.product_id ||
      !orderFormData.warehouse_id ||
      orderFormData.quantity === ""
    ) {
      setFormError(
        "Please select a product, warehouse and enter an order quantity."
      );
      return;
    }

    if (Number(orderFormData.quantity) <= 0) {
      setFormError("Order quantity must be greater than 0.");
      return;
    }

    const selectedProductId = Number(orderFormData.product_id);
    const selectedWarehouseId = Number(orderFormData.warehouse_id);
    const requestedQuantity = Number(orderFormData.quantity);

    const matchingInventory = inventory.find(
      (item) =>
        Number(item.product_id) === selectedProductId &&
        Number(item.warehouse_id) === selectedWarehouseId
    );

    if (!matchingInventory) {
      setFormError(
        "No inventory record exists for this product and warehouse."
      );
      return;
    }

    if (requestedQuantity > Number(matchingInventory.quantity)) {
      setFormError(
        `Not enough stock. Available quantity: ${matchingInventory.quantity}.`
      );
      return;
    }

    try {
      const response = await fetch(`${API_URL}/orders/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_id: selectedProductId,
          warehouse_id: selectedWarehouseId,
          quantity: requestedQuantity,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(response, "Unable to place order.")
        );
      }

      setFormMessage("Order placed successfully.");

      setOrderFormData({
        product_id: "",
        warehouse_id: "",
        quantity: "",
      });

      await fetchData();

      setTimeout(() => {
        setShowOrderForm(false);
        setFormMessage("");
      }, 900);
    } catch (error) {
      console.error("Add order error:", error);

      setFormError(
        error.message || "Unable to place order. Please try again."
      );
    }
  };

  // ---------------- CLOSE FORMS ----------------

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

  const closeWarehouseForm = () => {
    setShowWarehouseForm(false);

    setWarehouseFormData({
      name: "",
      location: "",
    });

    setFormMessage("");
    setFormError("");
  };

  const closeInventoryForm = () => {
    setShowInventoryForm(false);

    setInventoryFormData({
      product_id: "",
      warehouse_id: "",
      quantity: "",
    });

    setFormMessage("");
    setFormError("");
  };

  const closeOrderForm = () => {
    setShowOrderForm(false);

    setOrderFormData({
      product_id: "",
      warehouse_id: "",
      quantity: "",
    });

    setFormMessage("");
    setFormError("");
  };

  // ---------------- OPEN FORMS ----------------

  const openProductForm = () => {
    setFormMessage("");
    setFormError("");
    setShowProductForm(true);
  };

  const openWarehouseForm = () => {
    setFormMessage("");
    setFormError("");
    setShowWarehouseForm(true);
  };

  const openInventoryForm = () => {
    setFormMessage("");
    setFormError("");
    setShowInventoryForm(true);
  };

  const openOrderForm = () => {
    setFormMessage("");
    setFormError("");
    setShowOrderForm(true);
  };

  // ---------------- DASHBOARD DATA ----------------

  const totalStock = inventory.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );

  const lowStockItems = inventory.filter(
    (item) => Number(item.quantity || 0) <= 10
  );

  const handleNavigation = (section) => {
    setActiveSection(section);

    const sectionIds = {
      Dashboard: "dashboard",
      Products: "products",
      Warehouses: "warehouses",
      Inventory: "inventory",
      Orders: "orders",
    };

    const element = document.getElementById(sectionIds[section]);

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

          <small>
            FastAPI · {API_URL.replace(/^https?:\/\//, "")}
          </small>
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
              onClick={openProductForm}
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

            <button
              className="secondary-button"
              onClick={openWarehouseForm}
            >
              + Add Warehouse
            </button>
          </div>

          {loading ? (
            <div className="empty-state compact">
              <h4>Loading warehouses...</h4>
              <p>Checking connected storage locations.</p>
            </div>
          ) : warehouses.length === 0 ? (
            <div className="empty-state compact">
              <h4>No warehouses found</h4>
              <p>Add your first warehouse to get started.</p>
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

            <div className="section-actions">
              <button
                className="secondary-button"
                onClick={openInventoryForm}
              >
                + Add Inventory
              </button>

              <button
                className="secondary-button"
                onClick={fetchData}
              >
                ↻ Refresh
              </button>
            </div>
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
                Add inventory by selecting a product and warehouse.
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
                    <th>PRODUCT</th>
                    <th>WAREHOUSE</th>
                    <th>QUANTITY</th>
                  </tr>
                </thead>

                <tbody>
                  {inventory.map((item) => {
                    const product = products.find(
                      (entry) => Number(entry.id) === Number(item.product_id)
                    );
                    const warehouse = warehouses.find(
                      (entry) => Number(entry.id) === Number(item.warehouse_id)
                    );

                    return (
                      <tr key={item.id}>
                        <td>
                          <span className="muted-text">
                            #{item.id}
                          </span>
                        </td>

                        <td>
                          <div style={{ display: "grid", gap: "4px" }}>
                            <span className="table-primary">
                              {product?.name || "Unknown product"}
                            </span>
                            <span className="table-secondary">
                              ID: #{item.product_id}
                              {product?.sku ? ` • SKU: ${product.sku}` : ""}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div style={{ display: "grid", gap: "4px" }}>
                            <span className="table-primary">
                              {warehouse?.name || "Unknown warehouse"}
                            </span>
                            <span className="table-secondary">
                              ID: #{item.warehouse_id}
                              {warehouse?.location
                                ? ` • ${warehouse.location}`
                                : ""}
                            </span>
                          </div>
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
                    );
                  })}
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

            <button
              className="secondary-button"
              onClick={openOrderForm}
            >
              + Add Order
            </button>
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
              <p>
                No inventory records are currently below the low-stock
                threshold.
              </p>
            </div>
          ) : (
            <div className="alert-list">
              {lowStockItems.map((item) => {
  const product = products.find(
    (entry) => Number(entry.id) === Number(item.product_id)
  );

  const warehouse = warehouses.find(
    (entry) => Number(entry.id) === Number(item.warehouse_id)
  );

  return (
    <div className="stock-alert" key={item.id}>
      <div>
        <strong>
          {product?.name || `Product #${item.product_id}`}
        </strong>

        <span>
          Product #{item.product_id} ·{" "}
          {warehouse?.name || `Warehouse #${item.warehouse_id}`}
          {warehouse?.name ? ` (#${item.warehouse_id})` : ""}
        </span>
      </div>

      <span className="low-stock-value">
        {item.quantity}{" "}
        {Number(item.quantity) === 1 ? "unit" : "units"}
      </span>
    </div>
  );
})}
            </div>
          )}
        </section>

        <footer className="page-footer">
          <span>AI Inventory Management</span>
          <span>Inventory optimization dashboard</span>
        </footer>
      </main>

      {/* ADD PRODUCT MODAL */}
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

      {/* ADD WAREHOUSE MODAL */}
      {showWarehouseForm && (
        <div className="modal-overlay" onClick={closeWarehouseForm}>
          <div
            className="modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="section-kicker">
                  STORAGE LOCATIONS
                </span>

                <h3>Add Warehouse</h3>

                <p>
                  Add a new warehouse or storage location.
                </p>
              </div>

              <button
                className="modal-close"
                onClick={closeWarehouseForm}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddWarehouse}>
              <div className="form-grid">
                <div className="form-group full">
                  <label htmlFor="warehouse-name">
                    Warehouse Name
                  </label>

                  <input
                    id="warehouse-name"
                    name="name"
                    type="text"
                    value={warehouseFormData.name}
                    onChange={handleWarehouseInputChange}
                    placeholder="e.g. Main Warehouse"
                    autoFocus
                  />
                </div>

                <div className="form-group full">
                  <label htmlFor="warehouse-location">
                    Location
                  </label>

                  <input
                    id="warehouse-location"
                    name="location"
                    type="text"
                    value={warehouseFormData.location}
                    onChange={handleWarehouseInputChange}
                    placeholder="e.g. New York"
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
                  onClick={closeWarehouseForm}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  Save Warehouse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD INVENTORY MODAL */}
      {showInventoryForm && (
        <div className="modal-overlay" onClick={closeInventoryForm}>
          <div
            className="modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="section-kicker">
                  STOCK MANAGEMENT
                </span>

                <h3>Add Inventory</h3>

                <p>
                  Assign stock to a product and warehouse.
                </p>
              </div>

              <button
                className="modal-close"
                onClick={closeInventoryForm}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddInventory}>
              <div className="form-grid">
                <div className="form-group full">
                  <label htmlFor="inventory-product">
                    Product
                  </label>

                  <select
                    id="inventory-product"
                    name="product_id"
                    value={inventoryFormData.product_id}
                    onChange={handleInventoryInputChange}
                  >
                    <option value="">
                      Select a product
                    </option>

                    {products.map((product) => (
                      <option
                        key={product.id}
                        value={product.id}
                      >
                        #{product.id} — {product.name}
                        {product.sku ? ` — ${product.sku}` : ""}
                      </option>
                    ))}
                  </select>

                  {inventoryFormData.product_id && (
                    (() => {
                      const selectedProduct = products.find(
                        (product) =>
                          Number(product.id) ===
                          Number(inventoryFormData.product_id)
                      );

                      if (!selectedProduct) return null;

                      return (
                        <div
                          style={{
                            marginTop: "10px",
                            padding: "12px 14px",
                            border: "1px solid #e2e8f0",
                            borderRadius: "10px",
                            background: "#f8fafc",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "12px",
                              fontWeight: 700,
                              color: "#64748b",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            Selected Product
                          </div>
                          <div
                            style={{
                              marginTop: "4px",
                              fontWeight: 700,
                              color: "#1f2937",
                            }}
                          >
                            #{selectedProduct.id} — {selectedProduct.name}
                          </div>
                          <div
                            style={{
                              marginTop: "3px",
                              fontSize: "13px",
                              color: "#64748b",
                            }}
                          >
                            SKU: {selectedProduct.sku || "—"}
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>

                <div className="form-group full">
                  <label htmlFor="inventory-warehouse">
                    Warehouse
                  </label>

                  <select
                    id="inventory-warehouse"
                    name="warehouse_id"
                    value={inventoryFormData.warehouse_id}
                    onChange={handleInventoryInputChange}
                  >
                    <option value="">
                      Select a warehouse
                    </option>

                    {warehouses.map((warehouse) => (
                      <option
                        key={warehouse.id}
                        value={warehouse.id}
                      >
                        #{warehouse.id} — {warehouse.name}
                        {warehouse.location ? ` — ${warehouse.location}` : ""}
                      </option>
                    ))}
                  </select>

                  {inventoryFormData.warehouse_id && (
                    (() => {
                      const selectedWarehouse = warehouses.find(
                        (warehouse) =>
                          Number(warehouse.id) ===
                          Number(inventoryFormData.warehouse_id)
                      );

                      if (!selectedWarehouse) return null;

                      return (
                        <div
                          style={{
                            marginTop: "10px",
                            padding: "12px 14px",
                            border: "1px solid #e2e8f0",
                            borderRadius: "10px",
                            background: "#f8fafc",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "12px",
                              fontWeight: 700,
                              color: "#64748b",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            Selected Warehouse
                          </div>
                          <div
                            style={{
                              marginTop: "4px",
                              fontWeight: 700,
                              color: "#1f2937",
                            }}
                          >
                            #{selectedWarehouse.id} — {selectedWarehouse.name}
                          </div>
                          <div
                            style={{
                              marginTop: "3px",
                              fontSize: "13px",
                              color: "#64748b",
                            }}
                          >
                            Location: {selectedWarehouse.location || "—"}
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>

                <div className="form-group full">
                  <label htmlFor="inventory-quantity">
                    Quantity
                  </label>

                  <input
                    id="inventory-quantity"
                    name="quantity"
                    type="number"
                    min="0"
                    step="1"
                    value={inventoryFormData.quantity}
                    onChange={handleInventoryInputChange}
                    placeholder="e.g. 100"
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
                  onClick={closeInventoryForm}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  Save Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD ORDER MODAL */}
      {showOrderForm && (
        <div className="modal-overlay" onClick={closeOrderForm}>
          <div
            className="modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="section-kicker">
                  ORDER PROCESSING
                </span>

                <h3>Place Order</h3>

                <p>
                  Select the product, warehouse and quantity for
                  this order.
                </p>
              </div>

              <button
                className="modal-close"
                onClick={closeOrderForm}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddOrder}>
              <div className="form-grid">
                <div className="form-group full">
                  <label htmlFor="order-product">
                    Product
                  </label>

                  <select
                    id="order-product"
                    name="product_id"
                    value={orderFormData.product_id}
                    onChange={handleOrderInputChange}
                  >
                    <option value="">
                      Select a product
                    </option>

                    {products.map((product) => (
                      <option
                        key={product.id}
                        value={product.id}
                      >
                        {product.name} — {product.sku}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group full">
                  <label htmlFor="order-warehouse">
                    Warehouse
                  </label>

                  <select
                    id="order-warehouse"
                    name="warehouse_id"
                    value={orderFormData.warehouse_id}
                    onChange={handleOrderInputChange}
                  >
                    <option value="">
                      Select a warehouse
                    </option>

                    {warehouses.map((warehouse) => (
                      <option
                        key={warehouse.id}
                        value={warehouse.id}
                      >
                        {warehouse.name} — {warehouse.location}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group full">
                  <label htmlFor="order-quantity">
                    Order Quantity
                  </label>

                  <input
                    id="order-quantity"
                    name="quantity"
                    type="number"
                    min="1"
                    step="1"
                    value={orderFormData.quantity}
                    onChange={handleOrderInputChange}
                    placeholder="e.g. 20"
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
                  onClick={closeOrderForm}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  Place Order
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