import { useEffect, useState } from "react";
import "./App.css";

const API = "http://127.0.0.1:8000";

function App() {
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [p, w, i] = await Promise.all([
        fetch(`${API}/products/`),
        fetch(`${API}/warehouses/`),
        fetch(`${API}/inventory/`),
      ]);

      setProducts(await p.json());
      setWarehouses(await w.json());
      setInventory(await i.json());
    } catch (error) {
      console.error("Backend connection failed:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <div className="loading">Loading Inventory Management...</div>;
  }

  return (
    <div className="app">
      <header>
        <div>
          <h1>AI Inventory Management</h1>
          <p>Inventory Optimization Dashboard</p>
        </div>

        <div className="status">
          <span></span>
          Backend Connected
        </div>
      </header>

      <main>
        <section className="cards">
          <div className="card">
            <h3>Products</h3>
            <strong>{products.length}</strong>
          </div>

          <div className="card">
            <h3>Warehouses</h3>
            <strong>{warehouses.length}</strong>
          </div>

          <div className="card">
            <h3>Inventory Records</h3>
            <strong>{inventory.length}</strong>
          </div>

          <div className="card">
            <h3>Total Stock</h3>
            <strong>
              {inventory.reduce((total, item) => total + item.quantity, 0)}
            </strong>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Products</h2>
          </div>

          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Price</th>
              </tr>
            </thead>

            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>{product.id}</td>
                  <td>{product.name}</td>
                  <td>{product.sku}</td>
                  <td>{product.category}</td>
                  <td>${product.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Warehouses</h2>
          </div>

          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Location</th>
              </tr>
            </thead>

            <tbody>
              {warehouses.map((warehouse) => (
                <tr key={warehouse.id}>
                  <td>{warehouse.id}</td>
                  <td>{warehouse.name}</td>
                  <td>{warehouse.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Inventory</h2>
            <button onClick={loadData}>Refresh</button>
          </div>

          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Product ID</th>
                <th>Warehouse ID</th>
                <th>Quantity</th>
              </tr>
            </thead>

            <tbody>
              {inventory.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.product_id}</td>
                  <td>{item.warehouse_id}</td>
                  <td>
                    <span className="quantity">{item.quantity}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {inventory.length === 0 && (
            <div className="empty">
              No inventory records currently available.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;