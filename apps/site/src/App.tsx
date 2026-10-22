import { NavLink, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Pagina from "./pages/Pagina";
import Decision from "./pages/Decision";
import IndiceDecisiones from "./pages/IndiceDecisiones";
import HojaDecision from "./pages/HojaDecision";
import NoEncontrada from "./pages/NoEncontrada";

/**
 * La web del proyecto (ADR 0034).
 *
 * La cabecera ✓ y el pie ✓ son de aquí ✓; las páginas ✓ de documentación ✓
 * se generan del markdown del repo ✓ ✓.
 */

/** La guía es su propia página ✓: se enlaza tal cual ✓, no con el router ✓. */
const GUIA = `${import.meta.env.BASE_URL}guia/`;

export default function App() {
  return (
    <>
      <header className="cabecera">
        <div className="cabecera-cuerpo">
          <NavLink to="/" className="marca">
            <span className="marca-nombre">CodArch</span>
            <span className="marca-lema">el mapa vivo de la arquitectura</span>
          </NavLink>
          <nav className="navegacion">
            <NavLink to="/" end>
              Inicio
            </NavLink>
            <a href={GUIA}>Guía</a>
            <NavLink to="/docs/roadmap">Roadmap</NavLink>
            <NavLink to="/docs/model">Modelo</NavLink>
            <NavLink to="/adrs">Decisiones</NavLink>
            <NavLink to="/docs/contributing">Contribuir</NavLink>
          </nav>
        </div>
      </header>

      <main className="contenido">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/docs/:nombre" element={<Pagina />} />
          <Route path="/adrs" element={<IndiceDecisiones />} />
          <Route path="/adrs/:numero" element={<Decision />} />
          <Route path="/adrs/:numero/hoja" element={<HojaDecision />} />
          <Route path="*" element={<NoEncontrada />} />
        </Routes>
      </main>

      <footer className="pie">
        <div className="pie-cuerpo">
          <span>
            CodArch es software libre bajo MIT. La marca no se concede con la
            licencia.
          </span>
          <span>
            <a href="https://github.com/jaminsmoke/codarch">El repo</a> ·{" "}
            <a href="https://www.npmjs.com/package/codarch">En npm</a> ·{" "}
            <a href="https://github.com/jaminsmoke/codarch-action">La acción</a>
          </span>
        </div>
      </footer>
    </>
  );
}
