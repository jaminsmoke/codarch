import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "@codarch/ui/styles.css";

const container = document.getElementById("root");
if (!container) throw new Error("falta #root");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
