import { Route, Routes } from "react-router-dom";
import Marco from "./Marco";
import Inicio from "./pages/Inicio";
import Guia from "./pages/Guia";
import NoEncontrada from "./pages/NoEncontrada";

/**
 * La web del proyecto (ADR 0034).
 *
 * De momento ✓ ✅, dos vistas ✓ ✅: la portada ✓ ✅ y la guía ✓ ✅. El marco ✓
 * (cabecera ✓, navegación ✓ y pie ✓) envuelve a todas ✓ ✅ ✅.
 */
export default function App() {
  return (
    <Marco>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/guia/" element={<Guia />} />
        <Route path="*" element={<NoEncontrada />} />
      </Routes>
    </Marco>
  );
}
