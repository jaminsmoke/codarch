import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import Desplazamiento from "./components/Desplazamiento";
import Marco from "./Marco";
import Inicio from "./pages/Inicio";

/**
 * La web del proyecto (ADR 0034).
 *
 * Tres vistas ✓ ✅: la portada ✅ ✅, la guía ✅ ✅ y los documentos ✅ ✅. El marco
 * ✓ (cabecera ✓, navegación ✓ y pie ✓) envuelve a todas ✅ ✅.
 *
 * Cada vista se carga con su ruta ✓ ✅: la portada no lleva el markdown de los
 * documentos ✅ ✅ y la guía no lleva el de los ADR ✅ ✅.
 */

const Guia = lazy(() => import("./pages/Guia"));
const Docs = lazy(() => import("./pages/Docs"));
const Documento = lazy(() => import("./pages/Documento"));
const NoEncontrada = lazy(() => import("./pages/NoEncontrada"));

/** Mientras llega la vista ✓ ✅. */
function Espera() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-16" aria-busy="true">
      <div className="h-3 w-32 animate-pulse rounded-full bg-line" />
      <div className="mt-4 h-8 w-2/3 animate-pulse rounded-lg bg-line/70" />
      <div className="mt-3 h-3 w-1/2 animate-pulse rounded-full bg-line/60" />
    </div>
  );
}

export default function App() {
  return (
    <Marco>
      <Desplazamiento />
      <Suspense fallback={<Espera />}>
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/guia/" element={<Guia />} />
          <Route path="/docs/" element={<Docs />} />
          <Route path="/docs/*" element={<Documento />} />
          <Route path="*" element={<NoEncontrada />} />
        </Routes>
      </Suspense>
    </Marco>
  );
}
