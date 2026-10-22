import { Link } from "react-router-dom";

/** Cuando no hay nada en esa ruta. */
export default function NoEncontrada() {
  return (
    <div className="doc">
      <Link className="volver" to="/">
        ← Volver
      </Link>
      <h1>Aquí no hay nada</h1>
      <p>
        Quizá querías la <Link to="/guia/">guía</Link>, el{" "}
        <Link to="/docs/roadmap">roadmap</Link> o las{" "}
        <Link to="/adrs">decisiones</Link>.
      </p>
    </div>
  );
}
