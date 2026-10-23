import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Marco from "../Marco";
import Guia from "../react-pages/Guia";
import Inicio from "../react-pages/Inicio";

/**
 * La portada y la guía siguen en React (ADR 0046).
 *
 * Starlight se queda con los documentos; estas dos páginas conservan el marco
 * y la identidad que ya tenía la web. Los enlaces a `/docs/` salen del SPA y
 * cargan la página estática de Starlight.
 */

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function Docs() {
  useEffect(() => {
    window.location.reload();
  }, []);
  return null;
}

function InicioODocumentos() {
  useEffect(() => {
    window.location.assign(`${import.meta.env.BASE_URL}docs/`);
  }, []);
  return null;
}

export default function ReactSite() {
  return (
    <BrowserRouter basename={BASE}>
      <Routes>
        <Route
          path="/"
          element={
            <Marco>
              <Inicio />
            </Marco>
          }
        />
        <Route
          path="/guia/"
          element={
            <Marco>
              <Guia />
            </Marco>
          }
        />
        <Route path="/docs/*" element={<Docs />} />
        <Route path="*" element={<InicioODocumentos />} />
      </Routes>
    </BrowserRouter>
  );
}
