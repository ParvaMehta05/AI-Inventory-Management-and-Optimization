import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import MockChannelApp from "./MockChannelApp.jsx";

const isMockChannel = /^\/mock\/(amazon|flipkart|shopify)\/?$/i.test(
  window.location.pathname
);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {isMockChannel ? <MockChannelApp /> : <App />}
  </StrictMode>
);
