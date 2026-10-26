import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { aplicarTemaGuardado } from "@codarch/ui";
import App from "./App";
import "@codarch/ui/styles.css";

// El tema antes que nada: la primera pintura ya sale en el elegido (ADR 0084).
// Aquí no vale un script en línea: la CSP del escritorio lo prohíbe.
aplicarTemaGuardado();

const container = document.getElementById("root");
if (!container) throw new Error("falta #root");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
