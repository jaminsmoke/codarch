import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";

const raiz = document.getElementById("raiz");
if (!raiz) throw new Error("falta el nodo raíz");

// El prefijo es el del repo en GitHub Pages (`/codarch/`).
createRoot(raiz).render(
  <StrictMode>
    <BrowserRouter basename="/codarch">
      <App />
    </BrowserRouter>
  </StrictMode>
);
